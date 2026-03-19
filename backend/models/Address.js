import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: [true, 'Name is required'], trim: true },
  phone: { type: String, required: [true, 'Phone is required'], trim: true },
  pincode: { type: String, required: [true, 'Pincode is required'], trim: true },
  locality: { type: String, required: [true, 'Locality is required'], trim: true },
  address: { type: String, required: [true, 'Address is required'] },
  city: { type: String, required: [true, 'City is required'], trim: true },
  state: { type: String, required: [true, 'State is required'], trim: true },
  landmark: { type: String, trim: true },
  alternatePhone: { type: String, trim: true },
  type: {
    type: String,
    enum: ['Home', 'Work'],
    default: 'Home'
  },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

// Optimize checkout/address-book reads by user with default-first sorting.
addressSchema.index({ user: 1, isDefault: -1, createdAt: -1 });

addressSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

const Address = mongoose.model('Address', addressSchema);
export default Address;
