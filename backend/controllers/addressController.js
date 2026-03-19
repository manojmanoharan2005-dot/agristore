import Address from '../models/Address.js';

export const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id })
      .select('name phone pincode locality address city state type isDefault createdAt updatedAt')
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
    res.json({ addresses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addAddress = async (req, res) => {
  try {
    const payload = req.body || {};

    const addressData = {
      user: req.user._id,
      name: String(payload.name || '').trim(),
      phone: String(payload.phone || '').trim(),
      pincode: String(payload.pincode || '').trim(),
      locality: String(payload.locality || '').trim(),
      address: String(payload.address || '').trim(),
      city: String(payload.city || '').trim(),
      state: String(payload.state || '').trim(),
      landmark: payload.landmark ? String(payload.landmark).trim() : '',
      alternatePhone: payload.alternatePhone ? String(payload.alternatePhone).trim() : '',
      type: payload.type === 'Work' ? 'Work' : 'Home',
      isDefault: Boolean(payload.isDefault)
    };

    const requiredFields = ['name', 'phone', 'pincode', 'locality', 'address', 'city', 'state'];
    const missingField = requiredFields.find((field) => !addressData[field]);
    if (missingField) {
      return res.status(400).json({ message: `${missingField} is required` });
    }

    const address = new Address(addressData);
    await address.save();
    res.status(201).json({ address });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    Object.assign(address, req.body);
    await address.save();
    res.json({ address });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    address.isDefault = true;
    await address.save(); // pre-save hook handles unsetting others
    res.json({ address });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
