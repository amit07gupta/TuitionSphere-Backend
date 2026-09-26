const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET ||= 'isolated-student-fees-test-secret-123456789';
const service = require('../src/services/students/studentFeeService');
const adminInvoices = require('../src/services/admins/adminInvoiceService');

const image = Buffer.from('89504e470d0a1a0a', 'hex');
const reportInput = {
  amount: 250, paymentMode: 'UPI', paymentDate: '2026-09-17',
  transactionReference: 'UPI-12345', proofName: 'payment.png',
  proofData: `data:image/png;base64,${image.toString('base64')}`,
};
const student = { id: 'student-1', studentCode: 'ST-1', user: { name: 'Amit' } };

test('student invoice query derives ownership from the authenticated user', async () => {
  const db = {
    student: { findUnique: async ({ where }) => { assert.deepEqual(where, { userId: 'user-1' }); return student; } },
    invoice: { findMany: async ({ where, select }) => {
      assert.deepEqual(where, { admission: { studentId: 'student-1' } });
      assert.equal(select.paymentReports.select.proofData, undefined);
      return [{ id: 'invoice-1', invoiceNumber: 'INV-1', title: 'Tuition Fee', totalAmount: '500.00', paidAmount: '250.00', dueDate: new Date('2026-09-20'), status: 'PARTIALLY_PAID', admission: { grade: { gradeName: 'Grade 1' }, board: { code: 'ICSE' }, batch: { name: 'Batch A' }, academicSession: { name: '2026-27' } }, payments: [{ id: 'payment-1', amount: '250.00', paymentDate: new Date('2026-09-17') }], paymentReports: [] }];
    } },
  };
  const result = await service.list('user-1', db);
  assert.equal(result.invoices[0].outstandingAmount, 250);
  assert.equal(result.invoices[0].payments[0].amount, 250);
  assert.equal(result.student.studentCode, 'ST-1');
});

test('student may report only their own payable invoice and cannot duplicate a pending report', async () => {
  let pending = false;
  let created;
  const db = {
    student: { findUnique: async () => student },
    invoice: { findFirst: async ({ where }) => {
      assert.deepEqual(where, { id: 'invoice-1', admission: { studentId: 'student-1' } });
      return { id: 'invoice-1', status: 'PENDING', totalAmount: '500', paidAmount: '0' };
    } },
    studentPaymentReport: {
      findFirst: async () => pending ? { id: 'existing' } : null,
      create: async ({ data, select }) => { assert.equal(select.proofData, undefined); created = data; return { id: 'report-1', ...data, status: 'PENDING', createdAt: new Date() }; },
    },
  };
  const result = await service.submit('user-1', 'invoice-1', reportInput, db);
  assert.equal(result.status, 'PENDING');
  assert.equal(created.studentId, 'student-1');
  assert.equal(created.proofData.toString('hex'), image.toString('hex'));
  pending = true;
  await assert.rejects(service.submit('user-1', 'invoice-1', reportInput, db), (error) => error.statusCode === 409);
  db.invoice.findFirst = async () => null;
  await assert.rejects(service.submit('user-1', 'invoice-1', reportInput, db), (error) => error.statusCode === 404);
});

test('payment proof, dates, amount and reference are validated on the server', () => {
  assert.throws(() => service.parseReport({ ...reportInput, proofName: 'payment.pdf' }), /PDF, JPG or PNG/);
  assert.throws(() => service.parseReport({ ...reportInput, proofData: `data:image/png;base64,${Buffer.from('wrong').toString('base64')}` }), /does not match/);
  assert.throws(() => service.parseReport({ ...reportInput, paymentDate: '2026-02-30' }), /valid payment date/);
  assert.throws(() => service.parseReport({ ...reportInput, amount: 0 }), /valid payment amount/);
  assert.throws(() => service.parseReport({ ...reportInput, transactionReference: 'x' }), /Transaction reference/);
});

test('approval records a payment and changes the balance in one transaction', async () => {
  const calls = [];
  const invoice = { id: 'invoice-1', totalAmount: '500', paidAmount: '100', status: 'PARTIALLY_PAID' };
  const report = { id: 'report-1', invoiceId: 'invoice-1', amount: '250', paymentMode: 'UPI', paymentDate: new Date('2026-09-17'), transactionReference: 'UPI-12345', status: 'PENDING', invoice };
  const tx = {
    studentPaymentReport: { findUnique: async () => report, updateMany: async (args) => { calls.push(['report', args]); return { count: 1 }; } },
    payment: { findFirst: async () => null, create: async ({ data }) => { calls.push(['payment', data]); } },
    invoice: { updateMany: async (args) => { calls.push(['invoice', args]); return { count: 1 }; } },
  };
  const db = { $transaction: async (work) => work(tx) };
  const result = await service.review('report-1', 'admin-1', { decision: 'APPROVED' }, db);
  assert.deepEqual(result, { invoiceId: 'invoice-1', status: 'APPROVED' });
  assert.deepEqual(calls.map(([name]) => name), ['report', 'invoice', 'payment']);
  assert.equal(Number(calls[1][1].data.paidAmount), 350);
  assert.equal(calls[1][1].data.status, 'PARTIALLY_PAID');
  assert.equal(calls[2][1].receivedById, 'admin-1');
  report.status = 'APPROVED';
  await assert.rejects(service.review('report-1', 'admin-1', { decision: 'APPROVED' }, db), (error) => error.statusCode === 409);
  await assert.rejects(service.review('report-1', 'admin-1', { decision: 'REJECTED' }, db), /review reason/);
});

test('rejection stores a reason without changing the invoice balance', async () => {
  const changes = [];
  const db = { $transaction: async (work) => work({
    studentPaymentReport: {
      findUnique: async () => ({ id: 'report-1', invoiceId: 'invoice-1', status: 'PENDING', invoice: { id: 'invoice-1' } }),
      updateMany: async ({ data }) => { changes.push(data); return { count: 1 }; },
    },
    invoice: { updateMany: async () => { throw new Error('Invoice must not change'); } },
    payment: { create: async () => { throw new Error('Payment must not be recorded'); } },
  }) };
  assert.deepEqual(await service.review('report-1', 'admin-1', { decision: 'REJECTED', reviewNote: 'Reference did not match' }, db),
    { invoiceId: 'invoice-1', status: 'REJECTED' });
  assert.equal(changes[0].reviewNote, 'Reference did not match');
  assert.equal(changes[0].reviewedById, 'admin-1');
});

test('admin payment records a receipt and resolves the matching student report', async () => {
  const calls = [];
  const invoice = { id: 'invoice-1', totalAmount: '500', paidAmount: '0', status: 'PENDING' };
  const tx = {
    invoice: {
      findUnique: async () => invoice,
      updateMany: async ({ where, data }) => { calls.push(['invoice', where, data]); return { count: 1 }; },
    },
    payment: { findFirst: async () => null, create: async ({ data }) => { calls.push(['payment', data]); } },
    studentPaymentReport: { updateMany: async ({ where, data }) => { calls.push(['report', where, data]); } },
  };
  const db = { $transaction: async (work) => work(tx) };
  const result = await adminInvoices.recordPayment('invoice-1', {
    amount: 500, paymentMode: 'UPI', transactionReference: 'UPI-12345', paymentDate: '2026-09-17',
  }, 'admin-1', db);
  assert.equal(result, invoice);
  assert.deepEqual(calls.map(([name]) => name), ['invoice', 'payment', 'report']);
  assert.equal(calls[0][2].status, 'PAID');
  assert.equal(calls[2][1].status, 'PENDING');
  assert.equal(calls[2][1].transactionReference.equals, 'UPI-12345');
  assert.equal(calls[2][2].status, 'APPROVED');
});

test('student fee and admin verification API paths are documented', () => {
  const { paths } = require('../src/config/swagger');
  assert.ok(paths['/api/v1/student/fees'].get);
  assert.ok(paths['/api/v1/student/fees/{id}/payment-reports'].post);
  assert.ok(paths['/api/v1/invoices/payment-reports/{reportId}/review'].patch);
  assert.ok(paths['/api/v1/invoices/payment-reports/{reportId}/proof'].get);
});
