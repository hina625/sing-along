import mongoose from "mongoose";



const subscriptionSchema = new mongoose.Schema({
    user_id: {type: String, unique: true},
    subscription: {
        type: String,
        // 'plus' kept as a legacy alias for backwards compat with existing rows;
        // new signups land on 'free' / 'starter' / 'growth' / 'ministry_pro' / 'enterprise'.
        enum: ["free", "starter", "plus", "growth", "ministry_pro", "enterprise"],
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