const mongoose = require('mongoose');

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cake-shop'; 
mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Kết nối MongoDB thành công');
})
.catch((err) => {
  console.log('Lỗi kết nối MongoDB:', err);
});
