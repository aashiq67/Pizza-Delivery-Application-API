const Pizza = require('../model/pizza');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const availablePizza = async (req, res, next) => {
    var data = [];
    try {
        await Pizza.find({}).then(res => data = res)
        return res.status(200).json({ message: data })
    } catch (err) {
        console.log(err);
        return res.status(400).json({ message: "Unable to get data" })
    }
}

// ADD NEW PIZZA

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname+'/../public/images');
    },
    filename: function (req, file, cb) {
        console.log("original name", file.originalname);
        cb(null, Date.now() + '_' +file.originalname)
    }
})
const upload = multer({ storage: storage })

const getImage = (req, res, next) => {
    const img_name = req.params.img;
    const filePath = path.join(__dirname,`/../public/images/${img_name}`);
    
    fs.exists(filePath, function (exists) {
        if (!exists) {
            res.writeHead(404, {
                "Content-Type": "text/plain" });
            res.end("404 Not Found");
            return;
        }
        const ext = path.extname(img_name);
        const contentType = "text/plain";
        if (ext === ".png") {
            contentType = "image/png";
        }
        res.writeHead(200, {
            "Content-Type": contentType });
        fs.readFile(filePath,
            function (err, content) {
                res.end(content);
            });
    });
    
}

const addNewPizza = async (req, res, next) => {
    
    const img = (req.file) ? req.file.filename : null;
    const { name, price, veg } = req.body;
    const existingPizza = await Pizza.findOne({ name: name });
    
    if (existingPizza === null) {
        const newPizza = new Pizza({
            name,
            price,
            img,
            veg
        });
        await newPizza.save();
        const pizza = await Pizza.findOne({name:name})
        console.log(pizza);
        return res.status(200).json({ message: "Pizza successfully added", id: pizza.id })
    }
    return res.status(400).json({ message: "Pizza already exists" });
}

const updatePizza = async (req, res, next) => {
    let img = (req.file) ? req.file.filename : null;
    if(img===null) img = req.body.img;
    console.log("updatedimg=",img);
    const { id, name, price, veg } = req.body;
    console.log(req.body);
    const existingPizza = await Pizza.findById(id);
    
    if (existingPizza !== null) {
        await Pizza.updateOne({_id: id}, {name: name, price: price, img: img, veg: veg})
        return res.status(200).json({ message: "Pizza successfully updated", img: img })
    }
    return res.status(400).json({ message: "Pizza not found" });
}

const deletePizza = async (req, res, next) => {
    
    const id = req.body.id;
    try{
        await Pizza.deleteOne({_id: id});
        return res.status(200).json({message: 'pizza deleted successfully'})
    } catch(err){
        console.log(err);
        return res.status(400).json({message: 'cannot delete pizza'})
    }
}

exports.availablePizza = availablePizza;
exports.addNewPizza = addNewPizza;
exports.upload = upload;
exports.getImage = getImage;
exports.updatePizza = updatePizza;
exports.deletePizza = deletePizza;