const service = require('../services/tutors/tutorProfileService');
async function get(req,res,next){try{res.json({success:true,data:await service.getProfile(req.user.id)});}catch(e){next(e);}}
async function update(req,res,next){try{res.json({success:true,message:'Profile updated successfully',data:await service.updateProfile(req.user.id,req.body)});}catch(e){next(e);}}
async function settings(req,res,next){try{res.json({success:true,data:await service.saveSettings(req.user.id,req.body)});}catch(e){next(e);}}
async function sessions(req,res,next){try{res.json({success:true,data:await service.sessions(req.user)});}catch(e){next(e);}}
async function revokeSession(req,res,next){try{await service.revokeSession(req.user,req.params.id);res.json({success:true,message:'Session signed out'});}catch(e){next(e);}}
module.exports={get,update,settings,sessions,revokeSession};
