const test=require('node:test'),assert=require('node:assert/strict');
process.env.DATABASE_URL||='postgresql://test:test@localhost/test';process.env.JWT_SECRET||='isolated-tutor-profile-test-secret-123456789';
const {profileInput}=require('../src/services/tutors/tutorProfileService');
test('tutor profile accepts self-service fields',()=>{assert.deepEqual(profileInput({name:' Vineet Singh ',phone:'98765 43210',availability:'Weekday evenings'}),{name:'Vineet Singh',phone:'9876543210',availability:'Weekday evenings'});});
test('tutor profile rejects admin-controlled fields',()=>{assert.throws(()=>profileInput({designation:'Senior Tutor'}),/Only name, phone and availability/);assert.throws(()=>profileInput({phone:'123'}),/10 digits/);});
test('Swagger documents tutor profile endpoints',()=>{const p=require('../src/config/swagger').paths;for(const path of ['/api/v1/tutor-profile','/api/v1/tutor-profile/settings','/api/v1/tutor-profile/sessions','/api/v1/tutor-profile/sessions/{id}'])assert.ok(p[path]);});
