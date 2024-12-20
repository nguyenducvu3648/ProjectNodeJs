const express = require('express');
const productRouter = express.Router();
const auth = require('../config/auth');
const fs = require('fs');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');

const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/product-img');
    },
    filename: function (req, file, cb) {
        const name = Date.now() + '-' + file.originalname;
        cb(null, name);
    }
})
const upload = multer({ storage: storage })


let admin;

productRouter.get('/', (req, res) => {
    Product.find({}, (err, products) => {
        if (err) {
            console.log('Lỗi khi truy vấn sản phẩm:', err);
            return res.status(500).send('Lỗi khi truy vấn sản phẩm');
        }

        console.log('Sản phẩm đã lấy thành công:', products); 
        
        res.render('admin/products', { products: products });
    });
});



productRouter.get('/add-product', async (req, res) => {
    try {
      const categories = await Category.find({}); // Lấy danh sách danh mục
      const success = req.flash('success');
      const error = req.flash('error');
      res.render('admin/add-product', { categories, success, error });
    } catch (err) {
      console.error(err);
      req.flash('error', 'Something went wrong while loading the add product page.');
      res.redirect('/admin');
    }
  });
  
  // Route xử lý thêm sản phẩm
const slugify = require('slugify'); // Cài đặt thư viện slugify để tạo slug tự động

productRouter.post('/add-product', upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, category, special, vegan } = req.body;
    
    // Tạo slug tự động từ title nếu không có slug
    const slug = slugify(title, { lower: true });

    const image = req.file ? req.file.filename : null;

    const newProduct = new Product({
      title,
      description,
      price,
      category,
      image,
      slug, // Sử dụng slug tự tạo
      special: special === 'on',
      vegan: vegan === 'on',
    });

    await newProduct.save();
    res.redirect('/admin/product');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/add-product');
  }
});





productRouter.get('/edit-product/:id', auth.isAdmin, (req, res) => {
    
    Category.find(function (err, categories) {
        if (err) {
            console.log(err);
        }
        Product.findById(req.params.id, (err, product) => {
            if(err){
                console.log(err)
                return res.render('admin/404');
            }
            const admin = req.session.admin;
            const error = req.flash('error')
            const success = req.flash('success')
            let vegan=true;
            let special=true;
            if(product.vegan==null || product.vegan==false) vegan =false;
            if(product.special==null || product.special==false) special =false;

            res.render('admin/edit-product', {
                admin,
                success: success,
                error: error,
                title: product.title,
                description: product.description,
                categories: categories,
                category: product.category,
                image: product.image,
                special : special,
                vegan : vegan,
                price: product.price,
                id: product._id,
                gallery: product.images,
                // special : special

            })
        }).clone()
    })


})

productRouter.post('/edit-product/:id', upload.single('image'), (req, res) => {
    let {title,pimage,description,price,category,special,vegan} = req.body;
    console.log(special,'  ',vegan);
    let slug = title.toLowerCase();
    let image = typeof req.file !== "undefined" ? req.file.filename : "";
    let id = req.params.id;
    let price2 = parseFloat(price).toFixed(2);

    Product.findOne({ slug: slug, category: category, _id: { $ne: id } }, (err, product) => {
        console.log('searching for pro');
        if (err) console.log(err);
        if (product) {
            console.log('same product found');
            fs.unlink('public/images/product-img/' + pimage, (err) => {
                if (err) console.log(err);
                console.log('old img deleted');
            });
            req.flash('error', 'Product exists,choose another name.')
            return res.redirect('/admin/product/edit-product/' + id);
        } else {
            console.log('updating pro');

            Product.findById((id), async (err, product) => {
                if (err) console.log(err);
                let img = image!=="" ? image : pimage ;

                // if(image!==""){

                        product.title = title,
                        product.slug = slug,
                        product.description = description,
                        product.price = price2,
                        product.category = category,
                        product.image = img,
                        product.special = special,
                        product.vegan = vegan

                await product.save((err) => {
                    if (err) return console.log(err);
                    console.log('saving pro');

                    if (image !== "") {
                        console.log('image is already there');

                        if (product.image !== "") {
                            console.log('image updated');

                            fs.unlink('public/images/product-img/' + pimage, (err) => {
                                if (err) console.log(err);
                                console.log('old img deleted');

                            })
                        }

                    }
                    req.flash('success', 'Product edited successfully.')
                    res.redirect('/admin/product');
                })
            }).catch((err) => {
                console.log(err)
                // res.render('admin/404')
            })


        }
    })
})

productRouter.post('/edit-product/add-gallery/:id', upload.array('images', 5),async (req, res) => {

    let id = req.params.id;
    console.log(id);
    let images = req.files;

    if (images.length > 0) {
        let imageName = images.map((img) => {
            return img.filename;
        })

        await imageName.map((img) => {
            Product.findByIdAndUpdate({ _id: id }, { $push: { images: img } })
                .then((pro) => {
                    pro.save(() => {
                        console.log('saved');
                    })

                })
                
            })
            req.flash('success', 'gallery added!');
            res.redirect('/admin/product/edit-product/' + id);
    } else {
        res.redirect('/admin/product');
    }

})

productRouter.get('/edit-product/delete-gallery/:id/:img', auth.isAdmin, (req, res) => {
    let id = req.params.id;
    let img = req.params.img;

    Product.findById((id), async (err, pro) => {
        if(err){
            console.log(err)
            return res.redirect('/admin/*');
        }
        pro.images.pull(img);
        await pro.save(() => {
            fs.unlink('public/images/product-img/' + img, (err) => {
                if (err) console.log(err);
                console.log('old img deleted');

            })
            res.redirect('/admin/product/edit-product/' + id);
        })

    })
})


productRouter.get('/delete-product/:id', auth.isAdmin, (req, res) => {

    Product.findById(req.params.id, (err, pro) => {
        if (err) return console.log(err);
        fs.unlink('public/images/product-img/' + pro.image, (err) => {
            if (err) console.log(err);
            console.log('old img deleted');

        });
        pro.images.map((img) => {
            return fs.unlink('public/images/product-img/' + img, (err) => {
                if (err) console.log(err);
                console.log('old imgs deleted');

            });
        })

        Product.deleteOne(pro, () => {
            req.flash('success', `Product deleted successfully!`);

            res.redirect('/admin/product');
        })

    });

});



module.exports = productRouter