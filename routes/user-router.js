const express = require("express");
const userRouter = express.Router();
const User = require("../models/userModel");
const Address = require("../models/addressModel");
const Category = require("../models/categoryModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Wishlist = require("../models/wishlistModel");
const bcrypt = require("bcrypt");
const Banner = require("../models/bannerModel");


const securePassword = async (password) => {
  const passwordHash = await bcrypt.hash(password, 10);
  return passwordHash;
};

// Home page route
userRouter.get("/", async (req, res) => {
  const user = req.session.user;

  const banners = await Banner.find({}); // giữ nguyên phần banner
  const categories = await Category.find({});
  const specials = await Product.find({ special: true });

  let count = null;
  if (user) {
    req.session.user.discount = null;
    const cartItems = await Cart.findOne({ userId: user._id });
    if (cartItems) {
      count = cartItems.cart.length;
    }
  }

  let wishcount = null;
  if (user) {
    const wishlistItems = await Wishlist.findOne({ userId: user._id });
    if (wishlistItems) {
      wishcount = wishlistItems.wishlist.length;
    }
  }

  res.render("user/homepage", {
    user,
    banners,
    categories,
    specials,
    count,
    wishcount,
  });
});

// Registration route (without email/OTP)
userRouter.get("/register", (req, res) => {
  if (req.session.user) res.redirect("/home");
  else {
    const error = req.flash("error");
    const success = req.flash("success");
    res.render("user/signup", { error: error, success: success });
  }
});

// Handle registration form submission (without email/OTP)
userRouter.post("/register", async (req, res) => {
  const { name, email, contact, password, image } = req.body;
  let user = await User.findOne({ email });

  if (user) {
    req.flash(
      "error",
      `This Email is already registered in the name '${user.name}'`
    );
    return res.redirect("/register");
  }

  const spassword = await securePassword(password);
  user = new User({
    name: name,
    email: email,
    contact: contact,
    password: spassword,
    status: false, // bỏ qua xác nhận email
    image: image,
  });

  user
    .save()
    .then((result) => {
      let address = new Address({
        userId: result._id,
        details: [],
      });
      address.save(() => {
        req.flash("success", "Account created successfully. Please log in.");
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

// Login route (no email/OTP verification)
userRouter.get("/login", (req, res) => {
  req.session.account = null;
  if (req.session.user) {
    res.redirect("/");
  } else {
    const error = req.flash("error");
    const success = req.flash("success");
    res.render("user/login", { error: error, success: success });
  }
});

// Handle login form submission (without email/OTP verification)
userRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const userData = await User.findOne({ email });

  if (!userData) {
    req.flash("error", "No User found!");
    return res.redirect("/login");
  }

  const passwordMatch = await bcrypt.compare(password, userData.password);
  if (!passwordMatch) {
    req.flash("error", "Your Password is wrong!");
    return res.redirect("/login");
  }

  if (userData.status) {
    req.flash("error", "Your account is blocked by admin.");
    return res.redirect("/login");
  }

  req.session.user = userData;
  res.redirect("/");
});

// Forgot password route (no email/OTP verification)
userRouter.get("/forgot-password", async (req, res) => {
  let error = req.flash("error");
  let success = req.flash("success");
  let account = null;
  if (req.session.account) {
    account = req.session.account;
  }
  res.render("user/forgot-password", { error, success, account });
});

// Check email for forgotten password (no email/OTP verification)
userRouter.post("/check-email", async (req, res) => {
  let email = req.body.email;
  await User.findOne({ email: email }).then(async (account) => {
    if (account) {
      req.session.account = account;
      req.flash("success", "Account found, proceed to change your password.");
      res.redirect("/forgot-password");
    } else {
      req.flash("error", "No user found");
      res.redirect("/forgot-password");
    }
  });
});

// Logout route
userRouter.get("/logout", (req, res) => {
  req.session.user = null;
  req.flash("success", "You are logged out successfully!");
  res.redirect("/login");
});

// About page route
userRouter.get("/about", async (req, res) => {
  const user = req.session.user;

  let count = null;
  if (user) {
    req.session.user.discount = null;

    const cartItems = await Cart.findOne({ userId: user._id });

    if (cartItems) {
      count = cartItems.cart.length;
    }
  }

  let wishcount = null;

  if (user) {
    const wishlistItems = await Wishlist.findOne({ userId: user._id });

    if (wishlistItems) {
      wishcount = wishlistItems.wishlist.length;
    }
  }
  res.render("user/about", { user, count, wishcount });
});

// Contact page route
userRouter.get("/contact", async (req, res) => {
  const user = req.session.user;

  let count = null;
  if (user) {
    req.session.user.discount = null;

    const cartItems = await Cart.findOne({ userId: user._id });

    if (cartItems) {
      count = cartItems.cart.length;
    }
  }

  let wishcount = null;

  if (user) {
    const wishlistItems = await Wishlist.findOne({ userId: user._id });

    if (wishlistItems) {
      wishcount = wishlistItems.wishlist.length;
    }
  }
  res.render("user/contact", { user, count, wishcount });
});

// Search functionality
userRouter.post("/search", async (req, res) => {
  let payload = req.body.payload.trim();
  let search = await Product.find({
    title: { $regex: new RegExp(payload + ".*", "i") },
  }).exec();
  search = search.slice(0, 10);
  res.json({ payload: search });
});

module.exports = userRouter;
