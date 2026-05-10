import mongoose from "mongoose";
import { defaultRolePermissions } from "./rolePermissions";

const workspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 80,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true,
        lowercase: true,
        trim: true,
    },
    mode: {
        type: String,
        enum: ['worship', 'business', 'community', 'hybrid'],
        default: 'worship',
        index: true,
    },
    ownerUserId: {
        type: String,
        required: true,
        index: true,
    },
    branding: {
        logoUrl: { type: String, default: null },
        primaryColor: { type: String, default: '#5A2D82' }, // royal-purple
        accentColor:  { type: String, default: '#D4AF37' }, // deep-gold
    },
    // Per-role view/manage matrix. Admin is implicit (always all-true) so it's
    // not stored. Shape: { [role]: { [resourceKey]: { view, manage } } }.
    rolePermissions: {
        type: mongoose.Schema.Types.Mixed,
        default: defaultRolePermissions,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.workspace || mongoose.model('workspace', workspaceSchema);
