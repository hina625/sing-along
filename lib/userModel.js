import mongoose from "mongoose";



const subscriptionSchema = new mongoose.Schema({
    user_id: {type: String, unique: true},
    subscription: {
        type: String,
        enum: ["free","starter","plus"],
        default: "free"
    },
    subscription_expire: {
        type: Date,
        default: null
    },
    subscribe_start: {
        type: Date,
        default: null
    }
})



export default mongoose.models.subscription ||  mongoose.model('subscription',subscriptionSchema);