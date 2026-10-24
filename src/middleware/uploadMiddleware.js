import multer from 'multer';
import path from 'path';

// Set storage engine
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    // Generate unique filename with timestamp, random number and original extension
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});
// new fetures
// Check File Type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|webp|gif|svg|bmp/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Images Only (jpeg, jpg, png, webp, gif, svg, bmp)!'));
  }
}

// Init upload
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// Middleware to handle multiple or single uploaded files under any field name
const uploadAny = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Error uploading file(s)' });
    }
    // Backward compatibility: set req.file to the first file if files were uploaded
    if (req.files && req.files.length > 0 && !req.file) {
      req.file = req.files[0];
    }
    next();
  });
};

export { upload, uploadAny };
