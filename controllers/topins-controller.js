const Topins = require('./../model/topins')

const getTopins = async (req, res, next) => {
    let data;
    try {
        data = await Topins.find();
    } catch (err) {
        console.log(err);
        return res.status(400).json({message: `cannot get the ${name}, ${value}`})
    }
    return res.status(200).json({message: "data fetched successfully", data:data})
}

const addTopins = async (req, res, next) => {
    const {name, value, price} = req.body;
    console.log(req.body);
    if(value==="") return res.status(400).json({message: "invalid value"})
    
    let data;
    try{
        data = await Topins.findOne({});
    } catch(err){
        console.log(err);
        return res.status(400).json({message: "error while checking topins database"})
    }

    if(data===null){
        const newTopins = new Topins({
            sauce: [],
            cheese: [],
            veggies: []
        })
        await newTopins.save();
    };


    const newTopin = {
        [name]: value,
        price: price
    }
    console.log(newTopin);
    
    try {
        await Topins.updateOne({$push:{[name]:{"name": value, "price": price}}})
    } catch (err) {
        console.log(err);
        return res.status(400).json({message: `cannot add the ${name}, ${value}`})
    }
    return res.status(200).json({message: `${value} added successfully`})
}

const removeTopins = async (req, res, next) => {
    const {name, value, price} = req.body;
    if(name===null || value===null) return res.status(400).json({message: `cannot remove the ${name}, ${value}`})
    try {
        await Topins.updateOne({$pull:{[name]:{"name": value, "price": price}}})
    } catch (err) {
        console.log(err);
        return res.status(400).json({message: `cannot remove the ${name}, ${value}`})
    }
    return res.status(200).json({message: `${value} removed successfully`})
}

exports.getTopins = getTopins;
exports.addTopins = addTopins;
exports.removeTopins = removeTopins;