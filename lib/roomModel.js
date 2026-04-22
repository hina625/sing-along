import mongoose from "mongoose";
import { type } from "os";


const roomSchema = new mongoose.Schema({
    user_id: {type: String},
    room_id: {type: String,unique: true},
    start_time: {type: Date,default: new Date(Date.now())},
    user_plan: {type: String, default: "free"},
    end_time: {type: String,default: new Date(Date.now() + 1 * 60 * 60 * 1000)},
    isSchedule: {type: Boolean,default: false},
    description: {type: String,default: null},
    scheduleTime: {type: Date,default: null},
    status:  {type: String,default: 'private',enum: ['public','private']},
    image: {
        url: {type: String,default: null,required: false},
        public_id: {type: String,default: null,required: false}
    }
})



export default mongoose.models.room ||  mongoose.model('room',roomSchema);