import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// Token for Shubham (ID: 6a522ea916a993b706c0df45)
const token = jwt.sign({ id: '6a522ea916a993b706c0df45' }, process.env.JWT_SECRET, { expiresIn: '30d' });
console.log(token);
