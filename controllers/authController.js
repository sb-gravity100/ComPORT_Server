import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
   return jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
   });
};

// @desc    Register new user
// @route   POST /api/auth/register
export const register = async (req, res) => {
   try {
      const { username, email, password } = req.body;

      // Check if user exists
      const existingEmail = await User.findOne({ email });
      const existingUsername = await User.findOne({ username });

      if (existingEmail || existingUsername) {
         const errors = {
            email: '',
            username: '',
         };
         if (existingEmail) errors.email = 'Email is already in use';
         if (existingUsername) errors.username = 'Username is already taken';

         return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors,
         });
      }

      // Create user
      const user = await User.create({ username, email, password });

      res.status(201).json({
         success: true,
         id: user._id,
         username: user.username,
         email: user.email,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res) => {
   try {
      const { username, password } = req.body;

      // Check for user
      const user = await User.findOne({ username }).select('+password');
      if (!user) {
         return res.status(401).json({
            success: false,
            message: 'Username does not exist',
         });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
         return res.status(401).json({
            success: false,
            message: 'Password incorrect',
         });
      }

      res.json({
         success: true,
         id: user._id,
         username: user.username,
         email: user.email,
         token: generateToken(user._id),
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Get current user
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
   try {
      const user = await User.findById(req.user.id)
         .populate('savedBundles')
         .populate('reviews');
      console.log(user);
      res.json({
         success: true,
         user,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};
