const express = require('express');
const adminRouter = express.Router();
const bcrypt = require('bcrypt');
const fs = require('fs');
const Admin = require('../models/adminModel');
const Banner = require('../models/bannerModel');
const User = require('../models/userModel');
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const Coupon = require('../models/couponModel');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/banner-img');
    },
    filename: function (req, file, cb) {
        const name = Date.now() + '-' + file.originalname;
        cb(null, name);
    }
});
const upload = multer({ storage: storage });

let admin;

// Route trang login
adminRouter.get('/', async (req, res) => {
    if (req.session.user)
        res.redirect('/admin/dashboard');
    else {
        const error = req.flash('error');
        res.render('admin/login-ad', { error: error });
    }
});

// Route xử lý login
adminRouter.post('/', async (req, res) => {
    const { email, password } = req.body;
    const adminData = await Admin.findOne({ email: email, password: password });

    if (adminData) {
        req.session.admin = true;
        res.redirect('/admin/dashboard');
    } else {
        req.flash('error', 'Incorrect email or password');
        return res.redirect('/admin');
    }
});

// Dashboard không cần đăng nhập
adminRouter.get('/dashboard', async (req, res) => {
    const productCount = await Product.count();
    const categories = await Category.find({});
    const total = await Order.aggregate([
      {
        $match: { status: 'delivered' },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
        },
      },
    ]);
    res.render('admin/dashboard', { productCount, categories, total });
  });

// Route xem banner (Không cần đăng nhập)
adminRouter.get('/banner', async (req, res) => {
    Banner.find((err, banners) => {
        if (err) console.log(err);
        admin = req.session.admin;
        const success = req.flash('success');
        const error = req.flash('error');
        res.render('admin/banner', { banners, admin, success, error });
    });
});

// Thêm banner (Không cần đăng nhập)
adminRouter.get('/banner/add-banner', async (req, res) => {
    Category.find(function (err, categories) {
        admin = req.session.admin;
        res.render('admin/add-banner', { admin, categories });
    });
});

// Lưu banner (Không cần đăng nhập)
adminRouter.post('/banner/add-banner', upload.single('banner'), (req, res) => {
    let { title, caption, category } = req.body;
    let banner = req.file.filename;

    let newBanner = new Banner({
        banner,
        title,
        caption,
        category
    });

    newBanner.save((err) => {
        if (err) return console.log(err);

        req.flash('success', 'banner added successfully');
        res.redirect('/admin/banner');
    });
});


adminRouter.get('/users', async (req, res) => {
    let count = await User.count();
    User.find((err, users) => {
        if (err) return console.log(err);
        admin = req.session.admin;
        res.render('admin/users', { users: users, admin, count });
    });
});
adminRouter.get('/categorys', async (req, res) => {
    try {
      const categories = await Category.find({});
      const count = await Category.countDocuments();
      const success = req.flash('success');
      const error = req.flash('error');
      res.render('admin/categorys', { categories, count, success, error });
    } catch (err) {
      console.error(err);
      req.flash('error', 'Something went wrong while fetching categories');
      res.redirect('/admin');
    }
  });
  

// Chặn người dùng
adminRouter.get('/users/block/:id', async (req, res) => {
    User.findByIdAndUpdate(req.params.id, { status: "true" }).then((err) => {
        if (err) console.log(err);
        res.redirect('/admin/users');
    });
});

// Bỏ chặn người dùng
adminRouter.get('/users/unblock/:id', async (req, res) => {
    User.findByIdAndUpdate(req.params.id, { status: "false" }).then((err) => {
        if (err) console.log(err);
        res.redirect('/admin/users');
    });
});

adminRouter.get('/not', (req, res) => {
    res.render('admin/404');
});

module.exports = adminRouter;
