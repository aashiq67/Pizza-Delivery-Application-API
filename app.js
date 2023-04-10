const express = require('express');
const mongoose = require('mongoose');
const userRouter = require('./routes/user-routes');
const adminRouter = require('./routes/admin-routes');
const pizzaRouter = require('./routes/pizza-routes');
const topinsRouter = require('./routes/topins-routes')

const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
app.use(express.static('public')); 
app.use('/images', express.static('images'));
app.use(cors({
    credentials: true,
    origin: 'http://localhost:3000'
}));
app.use(express.json());
app.use('/user', userRouter);
app.use('/admin', adminRouter);
app.use('/pizza', pizzaRouter);
app.use('/topins', topinsRouter);

mongoose.connect("mongodb://127.0.0.1:27017/pizzaDB").then(() => console.log("DB connected")).catch((err) => console.log(err))

app.listen(5000, ()=>{
    console.log("http://localhost:5000");
});

