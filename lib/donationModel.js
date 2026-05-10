import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
    // For one-time gifts: Authorize.Net transaction id (transId).
    // For recurring: the *first charge* transactionId is null until ARB fires the first payment;
    // we still allow the row so the dashboard can show pending recurring setups.
    // Note: indexes defined below use partialFilterExpression so multiple null
    // values don't violate uniqueness (sparse alone doesn't help when the
    // schema sets `default: null` — the field is then *present*, just null).
    transactionId: {
        type: String,
        default: null,
    },
    // Authorize.Net ARB subscription id — present only for recurring donations.
    subscriptionId: {
        type: String,
        default: null,
    },
    isRecurring: {
        type: Boolean,
        default: false,
        index: true,
    },
    // 'monthly' | 'weekly' | 'yearly' — only meaningful when isRecurring=true.
    frequency: {
        type: String,
        enum: [null, 'weekly', 'monthly', 'yearly'],
        default: null,
    },
    nextChargeDate: {
        type: Date,
        default: null,
    },
    cancelledAt: {
        type: Date,
        default: null,
    },
    // Optional: clerk user id of the donor (when signed in).
    donorUserId: {
        type: String,
        default: null,
        index: true,
    },
    // Optional: clerk user id of the host whose ministry the gift goes to.
    // For now we don't have explicit ministry linkage, so it stays null.
    hostUserId: {
        type: String,
        default: null,
        index: true,
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'workspace',
        default: null,
        index: true,
    },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, default: '' },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'USD',
    },
    method: {
        type: String,
        enum: ['card', 'cash', 'zelle', 'venmo', 'paypal', 'other'],
        default: 'card',
    },
    status: {
        type: String,
        // 'pending'   — recurring subscription created, first charge not yet processed
        // 'succeeded' — charge cleared
        // 'failed'    — charge declined
        // 'refunded'  — refund issued
        // 'cancelled' — recurring subscription cancelled (no future charges)
        enum: ['pending', 'succeeded', 'failed', 'refunded', 'cancelled'],
        default: 'succeeded',
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

// Partial unique indexes — only enforce uniqueness on rows where the field is
// actually a string. This lets recurring donations co-exist with multiple
// `transactionId: null` rows, and one-time donations with multiple
// `subscriptionId: null` rows.
donationSchema.index(
    { transactionId: 1 },
    { unique: true, partialFilterExpression: { transactionId: { $type: 'string' } } },
);
donationSchema.index(
    { subscriptionId: 1 },
    { unique: true, partialFilterExpression: { subscriptionId: { $type: 'string' } } },
);
// donorUserId, hostUserId, workspaceId are already indexed via field-level `index: true`.

export default mongoose.models.donation || mongoose.model('donation', donationSchema);
