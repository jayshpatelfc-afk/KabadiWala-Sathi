export const MOCK_PRICES = [
  { 
    id: "pcb", 
    name: "Printed Circuit Boards (PCB)", 
    hiName: "सर्किट बोर्ड (PCB)", 
    price: 350, 
    unit: "kg", 
    trend: "+9.3%", 
    color: "bg-emerald-50 text-emerald-700 border-emerald-200" 
  },
  { 
    id: "cable", 
    name: "Copper Cables & Wires", 
    hiName: "तांबे का तार (Cables)", 
    price: 420, 
    unit: "kg", 
    trend: "+2.1%", 
    color: "bg-blue-50 text-blue-700 border-blue-200" 
  },
  { 
    id: "battery", 
    name: "Lithium-Ion Batteries", 
    hiName: "लिथियम बैटरी (Batteries)", 
    price: 340, 
    unit: "kg", 
    trend: "-1.5%", 
    color: "bg-amber-50 text-amber-700 border-amber-200" 
  },
  { 
    id: "mobile", 
    name: "Smartphones / Mobiles", 
    hiName: "पुराना मोबाइल (Mobiles)", 
    price: 180, 
    unit: "pc", 
    trend: "+5.0%", 
    color: "bg-purple-50 text-purple-700 border-purple-200" 
  },
];

export const MOCK_RECYCLERS = [
  { id: "REC-101", name: "EcoGreen Recyclers Ltd.", dist: "3.2 km", priceMul: 1.02, verified: true, pickup: true },
  { id: "REC-102", name: "Maha Metal Recovery Plant", dist: "7.8 km", priceMul: 1.05, verified: true, pickup: false },
];