const mongoose = require("mongoose");
const PriceItem = require("../models/PriceItem");
require("dotenv").config();

const precios = [
  { name: "Ropa interior", type: "por_prenda", points: 1, price: 630 },
  { name: "Remera/Pantalón", type: "por_prenda", points: 1, price: 630 },
  { name: "Buzo liviano", type: "por_prenda", points: 1, price: 630 },
  { name: "Buzo pesado", type: "por_prenda", points: 2, price: 630 },
  { name: "Campera liviana", type: "por_prenda", points: 2, price: 630 },
  { name: "Campera pesada", type: "por_prenda", points: 5, price: 630 },
  { name: "Sábana 1 plaza", type: "por_prenda", points: 3, price: 630 },
  { name: "Sábanas 2 plazas", type: "por_prenda", points: 5, price: 630 },
  { name: "Acolchado 1-1 ½ plazas", type: "fijo", price: 10300 },
  { name: "Frazada doble faz 1-1 ½", type: "fijo", price: 11600 },
  { name: "Acolchado 2-2 ½ plazas", type: "fijo", price: 11600 },
  { name: "Acolchado 2-2 ½ pesado", type: "fijo", price: 12900 },
  { name: "Frazada doble faz 2 plazas", type: "fijo", price: 14500 },
  { name: "Acolchado pluma 1 plaza", type: "fijo", price: 14400 }
];

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    await PriceItem.deleteMany();
    await PriceItem.insertMany(precios);
    console.log("✅ Precios insertados correctamente");
    process.exit();
  })
  .catch((err) => {
    console.error("❌ Error al insertar precios:", err);
    process.exit(1);
  });