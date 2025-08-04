const calculateTotal = (items) => {
  return items.reduce((acc, { item, quantity }) => {
    if (!item || typeof item.price !== "number" || typeof quantity !== "number") return acc;

    if (item.type === "por_prenda") {
      const puntos = item.points ?? 1;
      return acc + puntos * item.price * quantity;
    } else {
      return acc + item.price * quantity;
    }
  }, 0);
};

module.exports = {
  calculateTotal,
};