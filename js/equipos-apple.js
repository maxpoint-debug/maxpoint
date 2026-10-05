// Catálogo local de modelos y acabados Apple. Fuentes verificadas: ver EQUIPOS_APPLE_FUENTES.md.
var APPLE_MODELOS = [
  {"modelo":"iPhone 18 Pro Max","colores":["Negro","Plata","Azul glacial","Burdeos"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"iPhone 18 Pro","colores":["Negro","Plata","Azul glacial","Burdeos"],"capacidades":["256GB","512GB","1TB"]},
  {"modelo":"iPhone 17e","colores":["Negro","Blanco","Rosa palo"],"capacidades":["256GB","512GB"]},
  {"modelo":"iPhone 17 Pro Max","colores":["Plata","Naranja cósmico","Azul oscuro"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"iPhone 17 Pro","colores":["Plata","Naranja cósmico","Azul oscuro"],"capacidades":["256GB","512GB","1TB"]},
  {"modelo":"iPhone 17","colores":["Negro","Blanco","Azul neblina","Verde salvia","Lavanda"],"capacidades":["256GB","512GB"]},
  {"modelo":"iPhone Air","colores":["Negro espacial","Blanco nube","Dorado claro","Azul cielo"],"capacidades":["256GB","512GB","1TB"]},
  {"modelo":"iPhone 16e","colores":["Negro","Blanco"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPhone 16 Pro Max","colores":["Titanio negro","Titanio blanco","Titanio natural","Titanio desierto"],"capacidades":["256GB","512GB","1TB"]},
  {"modelo":"iPhone 16 Pro","colores":["Titanio negro","Titanio blanco","Titanio natural","Titanio desierto"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPhone 16 Plus","colores":["Negro","Blanco","Rosa","Verde azulado","Azul ultramar"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPhone 16","colores":["Negro","Blanco","Rosa","Verde azulado","Azul ultramar"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPhone 15 Pro Max","colores":["Titanio negro","Titanio blanco","Titanio azul","Titanio natural"],"capacidades":["256GB","512GB","1TB"]},
  {"modelo":"iPhone 15 Pro","colores":["Titanio negro","Titanio blanco","Titanio azul","Titanio natural"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPhone 15 Plus","colores":["Negro","Azul","Verde","Amarillo","Rosa"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPhone 15","colores":["Negro","Azul","Verde","Amarillo","Rosa"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPhone 14 Pro Max","colores":["Plata","Oro","Negro espacial","Morado oscuro"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPhone 14 Pro","colores":["Plata","Oro","Negro espacial","Morado oscuro"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPhone 14 Plus","colores":["Medianoche","Blanco estrella","(PRODUCT)RED","Azul","Morado","Amarillo"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPhone 14","colores":["Medianoche","Blanco estrella","(PRODUCT)RED","Azul","Morado","Amarillo"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPhone SE (3.ª generación)","colores":["(PRODUCT)RED","Blanco estrella","Medianoche"],"capacidades":["64GB","128GB","256GB"]},
  {"modelo":"iPhone 13 Pro Max","colores":["Grafito","Oro","Plata","Azul sierra","Verde alpino"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPhone 13 Pro","colores":["Grafito","Oro","Plata","Azul sierra","Verde alpino"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPhone 13","colores":["(PRODUCT)RED","Blanco estrella","Medianoche","Azul","Rosa","Verde"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPhone 13 mini","colores":["(PRODUCT)RED","Blanco estrella","Medianoche","Azul","Rosa","Verde"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPhone 12 Pro Max","colores":["Plata","Grafito","Oro","Azul pacífico"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPhone 12 Pro","colores":["Plata","Grafito","Oro","Azul pacífico"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPhone 12","colores":["Negro","Blanco","(PRODUCT)RED","Verde","Azul","Morado"],"capacidades":["64GB","128GB","256GB"]},
  {"modelo":"iPhone 12 mini","colores":["Negro","Blanco","(PRODUCT)RED","Verde","Azul","Morado"],"capacidades":["64GB","128GB","256GB"]},
  {"modelo":"iPhone SE (2.ª generación)","colores":["Blanco","Negro","(PRODUCT)RED"],"capacidades":["64GB","128GB","256GB"]},
  {"modelo":"iPhone 11 Pro","colores":["Plata","Gris espacial","Oro","Verde noche"],"capacidades":["64GB","256GB","512GB"]},
  {"modelo":"iPhone 11 Pro Max","colores":["Plata","Gris espacial","Oro","Verde noche"],"capacidades":["64GB","256GB","512GB"]},
  {"modelo":"iPhone 11","colores":["Malva","Verde","Amarillo","Negro","Blanco","(PRODUCT)RED"],"capacidades":["64GB","128GB","256GB"]},
  {"modelo":"iPhone XS","colores":["Plata","Gris espacial","Oro"],"capacidades":["64GB","256GB","512GB"]},
  {"modelo":"iPhone XS Max","colores":["Plata","Gris espacial","Oro"],"capacidades":["64GB","256GB","512GB"]},
  {"modelo":"iPhone XR","colores":["Negro","Blanco","Azul","Amarillo","Coral","(PRODUCT)RED"],"capacidades":["64GB","128GB","256GB"]},
  {"modelo":"iPhone X","colores":["Plata","Gris espacial"],"capacidades":["64GB","256GB"]},
  {"modelo":"iPhone 8","colores":["Dorado","Plateado","Gris espacial","(PRODUCT)RED"],"capacidades":["64GB","128GB","256GB"]},
  {"modelo":"iPhone 8 Plus","colores":["Dorado","Plateado","Gris espacial","(PRODUCT)RED"],"capacidades":["64GB","128GB","256GB"]},
  {"modelo":"iPhone 7","colores":["Negro","Negro brillante","Oro","Oro rosa","Plateado","(PRODUCT)RED"],"capacidades":["32GB","128GB","256GB"]},
  {"modelo":"iPhone 7 Plus","colores":["Negro","Negro brillante","Oro","Oro rosa","Plateado","(PRODUCT)RED"],"capacidades":["32GB","128GB","256GB"]},
  {"modelo":"iPhone SE (1.ª generación)","colores":["Gris espacial","Plateado","Dorado","Oro rosa"],"capacidades":["16GB","32GB","64GB","128GB"]},
  {"modelo":"iPhone 6s","colores":["Gris espacial","Plateado","Dorado","Oro rosa"],"capacidades":["16GB","32GB","64GB","128GB"]},
  {"modelo":"iPhone 6s Plus","colores":["Gris espacial","Plateado","Dorado","Oro rosa"],"capacidades":["16GB","32GB","64GB","128GB"]},
  {"modelo":"iPhone 6","colores":["Gris espacial","Plateado","Dorado"],"capacidades":["16GB","32GB","64GB","128GB"]},
  {"modelo":"iPhone 6 Plus","colores":["Gris espacial","Plateado","Dorado"],"capacidades":["16GB","64GB","128GB"]},
  {"modelo":"iPhone 5s","colores":["Gris espacial","Plateado","Dorado"],"capacidades":["16GB","32GB","64GB"]},
  {"modelo":"iPhone 5c","colores":["Blanco","Azul","Rosa","Verde","Amarillo"],"capacidades":["8GB","16GB","32GB"]},
  {"modelo":"iPhone 5","colores":["Negro","Blanco"],"capacidades":["16GB","32GB","64GB"]},
  {"modelo":"iPhone 4s","colores":["Negro","Blanco"],"capacidades":["8GB","16GB","32GB","64GB"]},
  {"modelo":"iPhone 4","colores":["Negro","Blanco"],"capacidades":["8GB","16GB","32GB"]},
  {"modelo":"iPhone 3GS","colores":["Negro","Blanco"],"capacidades":["8GB","16GB","32GB"]},
  {"modelo":"iPhone 3G","colores":[],"capacidades":["8GB","16GB"]},
  {"modelo":"iPhone","colores":[],"capacidades":["4GB","8GB","16GB"]},
  {"modelo":"iPad Pro de 13 pulgadas (M5)","colores":["Plata","Negro espacial"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"iPad Pro de 11 pulgadas (M5)","colores":["Plata","Negro espacial"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"iPad Pro de 13 pulgadas (M4)","colores":["Plata","Negro espacial"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"iPad Pro de 11 pulgadas (M4)","colores":["Plata","Negro espacial"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"iPad Pro de 12,9 pulgadas (6.ª generación)","colores":["Plata","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB","2TB"]},
  {"modelo":"iPad Pro de 11 pulgadas (4.ª generación)","colores":["Plata","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB","2TB"]},
  {"modelo":"iPad Pro de 12,9 pulgadas (5.ª generación)","colores":["Plata","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB","2TB"]},
  {"modelo":"iPad Pro de 11 pulgadas (3.ª generación)","colores":["Plata","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB","2TB"]},
  {"modelo":"iPad Pro de 12,9 pulgadas (4.ª generación)","colores":["Plata","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPad Pro de 11 pulgadas (2.ª generación)","colores":["Plata","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPad Pro de 12,9 pulgadas (3.ª generación)","colores":["Plata","Gris espacial"],"capacidades":["64GB","256GB","512GB","1TB"]},
  {"modelo":"iPad Pro de 11 pulgadas","colores":["Plata","Gris espacial"],"capacidades":["64GB","256GB","512GB","1TB"]},
  {"modelo":"iPad Pro de 12,9 pulgadas (2.ª generación)","colores":["Gris espacial","Oro","Plata"],"capacidades":["64GB","256GB","512GB"]},
  {"modelo":"iPad Pro (10,5 pulgadas)","colores":["Gris espacial","Oro rosa","Oro","Plata"],"capacidades":["64GB","256GB","512GB"]},
  {"modelo":"iPad Pro (9,7 pulgadas)","colores":["Plata","Oro","Gris espacial","Oro rosa"],"capacidades":["32GB","128GB","256GB"]},
  {"modelo":"iPad Pro (12,9 pulgadas)","colores":["Plata","Oro","Gris espacial"],"capacidades":["32GB","128GB","256GB"]},
  {"modelo":"iPad Air de 13 pulgadas (M4)","colores":["Azul","Púrpura","Blanco estrella","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPad Air de 11 pulgadas (M4)","colores":["Azul","Púrpura","Blanco estrella","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPad Air de 13 pulgadas (M3)","colores":["Azul","Púrpura","Blanco estrella","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPad Air de 11 pulgadas (M3)","colores":["Azul","Púrpura","Blanco estrella","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPad Air de 13 pulgadas (M2)","colores":["Azul","Púrpura","Blanco estrella","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPad Air de 11 pulgadas (M2)","colores":["Azul","Púrpura","Blanco estrella","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"iPad Air (5.ª generación)","colores":["Gris espacial","Blanco estrella","Rosa","Púrpura","Azul"],"capacidades":["64GB","256GB"]},
  {"modelo":"iPad Air (4.ª generación)","colores":["Plata","Gris espacial","Oro rosa","Verde","Azul cielo"],"capacidades":["64GB","256GB"]},
  {"modelo":"iPad Air (3.ª generación)","colores":["Gris espacial","Plata","Oro"],"capacidades":["64GB","256GB"]},
  {"modelo":"iPad Air 2","colores":["Plata","Oro","Gris espacial"],"capacidades":["16GB","32GB","64GB","128GB"]},
  {"modelo":"iPad Air","colores":["Gris espacial","Plata"],"capacidades":["16GB","32GB","64GB","128GB"]},
  {"modelo":"iPad mini (A17 Pro)","colores":["Azul","Púrpura","Blanco estrella","Gris espacial"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPad mini (6.ª generación)","colores":["Gris espacial","Rosa","Púrpura","Blanco estrella"],"capacidades":["64GB","256GB"]},
  {"modelo":"iPad mini (5.ª generación)","colores":["Gris espacial","Plata","Oro"],"capacidades":["64GB","256GB"]},
  {"modelo":"iPad mini 4","colores":["Plata","Oro","Gris espacial"],"capacidades":["16GB","32GB","64GB","128GB"]},
  {"modelo":"iPad mini 3","colores":["Plata","Oro","Gris espacial"],"capacidades":["16GB","64GB","128GB"]},
  {"modelo":"iPad mini 2","colores":["Gris espacial","Plata"],"capacidades":["16GB","32GB","64GB","128GB"]},
  {"modelo":"iPad mini","colores":["Negro","Grafito","Blanco","Plata"],"capacidades":["16GB","32GB","64GB"]},
  {"modelo":"iPad (A16)","colores":["Plata","Azul","Rosa","Amarillo"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"iPad (10.ª generación)","colores":["Plata","Azul","Rosa","Amarillo"],"capacidades":["64GB","256GB"]},
  {"modelo":"iPad (9.ª generación)","colores":["Plata","Gris espacial"],"capacidades":["64GB","256GB"]},
  {"modelo":"iPad (8.ª generación)","colores":["Plata","Gris espacial","Oro"],"capacidades":["32GB","128GB"]},
  {"modelo":"iPad (7.ª generación)","colores":["Plata","Gris espacial","Oro"],"capacidades":["32GB","128GB"]},
  {"modelo":"iPad (6.ª generación)","colores":["Plata","Oro","Gris espacial"],"capacidades":["32GB","128GB"]},
  {"modelo":"iPad (5.ª generación)","colores":["Plata","Oro","Gris espacial"],"capacidades":["32GB","128GB"]},
  {"modelo":"iPad (4.ª generación)","colores":["Negro","Blanco"],"capacidades":["16GB","32GB","64GB","128GB"]},
  {"modelo":"iPad (3.ª generación)","colores":[],"capacidades":["16GB","32GB","64GB"]},
  {"modelo":"iPad 2","colores":[],"capacidades":["16GB","32GB","64GB"]},
  {"modelo":"iPad","colores":[],"capacidades":["16GB","32GB","64GB"]},
  {"modelo":"Apple Watch Series 12","colores":["Gris espacial","Negro","Dorado claro","Bronce oscuro","Oro brillante","Natural","Blanco perla","Azul nocturno"],"capacidades":[]},
  {"modelo":"Apple Watch Series 12 (GPS)","colores":["Gris espacial","Negro","Dorado claro","Bronce oscuro"],"capacidades":[]},
  {"modelo":"Apple Watch Series 12 (GPS + Cellular) aluminio","colores":["Gris espacial","Negro","Dorado claro","Bronce oscuro"],"capacidades":[]},
  {"modelo":"Apple Watch Series 12 (GPS + Cellular) titanio","colores":["Oro brillante","Natural"],"capacidades":[]},
  {"modelo":"Apple Watch Series 12 (GPS + Cellular) cerámica","colores":["Blanco perla","Azul nocturno"],"capacidades":[]},
  {"modelo":"Apple Watch Series 12 Hermès (GPS + Cellular)","colores":["Oro brillante","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch Ultra 4","colores":["Natural","Negro"],"capacidades":[]},
  {"modelo":"Apple Watch Ultra 4 (GPS + Cellular)","colores":["Natural","Negro"],"capacidades":[]},
  {"modelo":"Apple Watch Ultra 4 Hermès (GPS + Cellular)","colores":["Natural"],"capacidades":[]},
  {"modelo":"Apple Watch Series 11","colores":["Gris espacial","Plata","Oro rosa","Negro azabache","Natural","Dorado","Pizarra"],"capacidades":[]},
  {"modelo":"Apple Watch Series 11 (GPS)","colores":["Gris espacial","Plata","Oro rosa","Negro azabache"],"capacidades":[]},
  {"modelo":"Apple Watch Series 11 (GPS + Cellular) aluminio","colores":["Gris espacial","Plata","Oro rosa","Negro azabache"],"capacidades":[]},
  {"modelo":"Apple Watch Series 11 (GPS + Cellular) titanio","colores":["Natural","Dorado","Pizarra"],"capacidades":[]},
  {"modelo":"Apple Watch Hermès Series 11 (GPS + Cellular)","colores":["Plateado"],"capacidades":[]},
  {"modelo":"Apple Watch SE 3","colores":["Medianoche","Blanco estrella"],"capacidades":[]},
  {"modelo":"Apple Watch SE 3 (GPS)","colores":["Medianoche","Blanco estrella"],"capacidades":[]},
  {"modelo":"Apple Watch SE 3 (GPS + Cellular)","colores":["Medianoche","Blanco estrella"],"capacidades":[]},
  {"modelo":"Apple Watch Ultra 3","colores":["Natural","Negro"],"capacidades":[]},
  {"modelo":"Apple Watch Ultra 3 (GPS + Cellular)","colores":["Natural","Negro"],"capacidades":[]},
  {"modelo":"Apple Watch Hermès Ultra 3 (GPS + Cellular)","colores":["Natural"],"capacidades":[]},
  {"modelo":"Apple Watch Series 10","colores":["Negro brillante","Oro rosa","Plata","Natural","Pizarra","Oro"],"capacidades":[]},
  {"modelo":"Apple Watch Series 10 (GPS)","colores":["Negro brillante","Oro rosa","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch Series 10 (GPS + Cellular) de aluminio","colores":["Negro brillante","Oro rosa","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch Series 10 (GPS + Cellular) de titanio","colores":["Natural","Pizarra","Oro"],"capacidades":[]},
  {"modelo":"Apple Watch Hermès Series 10 (GPS + Cellular)","colores":["Plateado"],"capacidades":[]},
  {"modelo":"Apple Watch Ultra 2","colores":["Natural","Negro"],"capacidades":["64GB"]},
  {"modelo":"Apple Watch Ultra 2 (GPS + Cellular)","colores":["Natural","Negro"],"capacidades":["64GB"]},
  {"modelo":"Apple Watch Hermès Ultra 2 (GPS + Cellular)","colores":["Natural"],"capacidades":[]},
  {"modelo":"Apple Watch Series 9","colores":["Medianoche","Blanco estrella","Plata","Rosa","(PRODUCT) RED","Grafito","Oro"],"capacidades":["64GB"]},
  {"modelo":"Apple Watch Series 9 (GPS)","colores":["Medianoche","Blanco estrella","Plata","Rosa","(PRODUCT) RED"],"capacidades":["64GB"]},
  {"modelo":"Apple Watch Series 9 (GPS + Cellular) de aluminio","colores":["Medianoche","Blanco estrella","Plata","Rosa","(PRODUCT) RED"],"capacidades":["64GB"]},
  {"modelo":"Apple Watch Series 9 (GPS + Cellular) de acero inoxidable","colores":["Plata","Grafito","Oro"],"capacidades":["64GB"]},
  {"modelo":"Apple Watch Series 9 Hermès (GPS + Cellular)","colores":["Plata","Negro espacial"],"capacidades":["64GB"]},
  {"modelo":"Apple Watch Ultra (GPS + Cellular)","colores":["Natural"],"capacidades":[]},
  {"modelo":"Apple Watch Series 8","colores":["Medianoche","Blanco estrella","Verde","(PRODUCT) RED","Plata","Grafito","Oro"],"capacidades":["32GB"]},
  {"modelo":"Apple Watch Series 8 (GPS)","colores":["Medianoche","Blanco estrella","Verde","(PRODUCT) RED"],"capacidades":["32GB"]},
  {"modelo":"Apple Watch Series 8 (GPS + Cellular) de aluminio","colores":["Medianoche","Blanco estrella","(PRODUCT) RED"],"capacidades":["32GB"]},
  {"modelo":"Apple Watch Series 8 (GPS + Cellular) de acero inoxidable","colores":["Plata","Grafito","Oro"],"capacidades":["32GB"]},
  {"modelo":"Apple Watch Series 8 Hermès (GPS + Cellular)","colores":["Plata","Negro espacial"],"capacidades":["32GB"]},
  {"modelo":"Apple Watch SE 2","colores":["Plata","Medianoche","Blanco estrella"],"capacidades":[]},
  {"modelo":"Apple Watch SE 2 (GPS)","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch SE 2 (GPS + Cellular)","colores":["Plata","Medianoche","Blanco estrella"],"capacidades":[]},
  {"modelo":"Apple Watch Series 7","colores":["Medianoche","Blanco estrella","Verde","Azul","(PRODUCT)RED","Plata","Grafito","Oro"],"capacidades":[]},
  {"modelo":"Apple Watch Series 7 (GPS)","colores":["Medianoche","Blanco estrella","Verde","Azul","(PRODUCT)RED"],"capacidades":[]},
  {"modelo":"Apple Watch Nike (GPS)","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Series 7 (GPS + Cellular) de aluminio","colores":["Medianoche","Blanco estrella","Verde","Azul","(PRODUCT)RED"],"capacidades":[]},
  {"modelo":"Apple Watch Nike (GPS + Cellular)","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Series 7 (GPS + Cellular) de acero inoxidable","colores":["Plata","Grafito","Oro"],"capacidades":[]},
  {"modelo":"Apple Watch Hermès (GPS + Cellular)","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Edition (GPS + Cellular) de titanio","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Series 6","colores":["Gris espacial","Oro","Plata","Rojo","Azul","Grafito"],"capacidades":[]},
  {"modelo":"Apple Watch Series 6 (GPS)","colores":["Gris espacial","Oro","Plata","Rojo","Azul"],"capacidades":[]},
  {"modelo":"Apple Watch Series 6 (GPS + Cellular) de aluminio","colores":["Gris espacial","Oro","Plata","Rojo","Azul"],"capacidades":[]},
  {"modelo":"Apple Watch Series 6 (GPS + Cellular) de acero inoxidable","colores":["Plata","Grafito","Oro"],"capacidades":[]},
  {"modelo":"Apple Watch SE","colores":["Gris espacial","Oro","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch SE (GPS)","colores":["Gris espacial","Oro","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch SE (GPS + Cellular) de aluminio","colores":["Gris espacial","Oro","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch Series 5","colores":["Gris espacial","Oro","Plata","Negro espacial"],"capacidades":[]},
  {"modelo":"Apple Watch Series 5 (GPS)","colores":["Gris espacial","Oro","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch Series 5 (GPS + Cellular) de aluminio","colores":["Gris espacial","Oro","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch Series 5 (GPS + Cellular) de acero inoxidable","colores":["Negro espacial","Oro"],"capacidades":[]},
  {"modelo":"Apple Watch Edition (GPS + Cellular) de cerámica","colores":["Blanca"],"capacidades":[]},
  {"modelo":"Apple Watch Series 4","colores":["Gris espacial","Oro","Plata","Negro espacial"],"capacidades":[]},
  {"modelo":"Apple Watch Series 4 (GPS)","colores":["Gris espacial","Oro","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch Nike+ (GPS)","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Series 4 (GPS + Cellular) de aluminio","colores":["Gris espacial","Oro","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch Nike+ (GPS + Cellular)","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Series 4 (GPS + Cellular) de acero inoxidable","colores":["Negro espacial","Oro"],"capacidades":[]},
  {"modelo":"Apple Watch Series 3","colores":["Gris espacial","Oro","Plata","Negro espacial","Acero inoxidable"],"capacidades":[]},
  {"modelo":"Apple Watch Series 3 (GPS)","colores":["Gris espacial","Oro","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch Series 3 (GPS + Cellular) de aluminio","colores":["Gris espacial","Oro","Plata"],"capacidades":[]},
  {"modelo":"Apple Watch Series 3 (GPS + Cellular) de acero inoxidable","colores":["Negro espacial","Acero inoxidable"],"capacidades":[]},
  {"modelo":"Apple Watch Edition (GPS + Cellular)","colores":["Blanca","Gris"],"capacidades":[]},
  {"modelo":"Apple Watch Series 2","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Series 2 de aluminio","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Nike+","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Series 2 de acero inoxidable","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Hermès","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Edition","colores":["Blanca","Gris"],"capacidades":[]},
  {"modelo":"Apple Watch Series 1","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Series 1 de aluminio","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch (1.ª generación)","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch","colores":[],"capacidades":[]},
  {"modelo":"Apple Watch Sport","colores":[],"capacidades":[]},
  {"modelo":"MacBook Air (15 pulgadas, M5)","colores":["Plata","Blanco estrella","Azul cielo","Medianoche"],"capacidades":["512GB","1TB","2TB","4TB"]},
  {"modelo":"MacBook Air (13 pulgadas, M5)","colores":["Plata","Blanco estrella","Azul cielo","Medianoche"],"capacidades":["512GB","1TB","2TB","4TB"]},
  {"modelo":"MacBook Air (15 pulgadas, M4, 2025)","colores":["Plata","Blanco estrella","Azul cielo","Medianoche"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Air (13 pulgadas, M4, 2025)","colores":["Plata","Blanco estrella","Azul cielo","Medianoche"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Air (15 pulgadas, M3, 2024)","colores":["Plata","Blanco estrella","Gris espacial","Medianoche"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Air (13 pulgadas, M3, 2024)","colores":["Plata","Blanco estrella","Gris espacial","Medianoche"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Air (15 pulgadas, M2, 2023)","colores":["Plata","Blanco estrella","Gris espacial","Medianoche"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Air (M2, 2022)","colores":["Plata","Blanco estrella","Gris espacial","Medianoche"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Air (M1, 2020)","colores":["Gris espacial","Oro","Plata"],"capacidades":["128GB","256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Air (Retina, 13 pulgadas, 2020)","colores":["Gris espacial","Oro","Plata"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Air (Retina, 13 pulgadas, 2019)","colores":["Gris espacial","Oro","Plata"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"MacBook Air (Retina, 13 pulgadas, 2018)","colores":["Gris espacial","Oro","Plata"],"capacidades":["128GB","256GB","512GB","1TB","5TB"]},
  {"modelo":"MacBook Air (13 pulgadas, 2017)","colores":["Plata"],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"MacBook Air (13 pulgadas, principios de 2015)","colores":[],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"MacBook Air (11 pulgadas, principios de 2015)","colores":[],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"MacBook Air (13 pulgadas, principios de 2014)","colores":[],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"MacBook Air (11 pulgadas, principios de 2014)","colores":[],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"MacBook Air (13 pulgadas, mediados de 2013)","colores":[],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"MacBook Air (11 pulgadas, mediados de 2013)","colores":[],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"MacBook Air (13 pulgadas, mediados de 2012)","colores":[],"capacidades":["128GB","256GB","512GB"]},
  {"modelo":"MacBook Air (11 pulgadas, mediados de 2012)","colores":[],"capacidades":["64GB","128GB","256GB","512GB"]},
  {"modelo":"MacBook Air (13 pulgadas, mediados de 2011)","colores":[],"capacidades":["128GB","256GB"]},
  {"modelo":"MacBook Air (11 pulgadas, mediados de 2011)","colores":[],"capacidades":["64GB","128GB","256GB"]},
  {"modelo":"MacBook Air (13 pulgadas, finales de 2010)","colores":[],"capacidades":["128GB","256GB"]},
  {"modelo":"MacBook Air (11 pulgadas, finales de 2010)","colores":[],"capacidades":["64GB","128GB"]},
  {"modelo":"MacBook Air (mediados de 2009)","colores":[],"capacidades":["120GB","128GB","200GB"]},
  {"modelo":"MacBook Pro (14 pulgadas, M5 Pro o M5 Max)","colores":["Plata","Negro espacial"],"capacidades":["1TB","2TB","4TB","8TB"]},
  {"modelo":"MacBook Pro (16 pulgadas, M5 Pro o M5 Max)","colores":["Plata","Negro espacial"],"capacidades":["1TB","2TB","4TB","8TB"]},
  {"modelo":"MacBook Pro (14 pulgadas, M5)","colores":["Plata","Negro espacial"],"capacidades":["512GB","1TB","2TB","4TB"]},
  {"modelo":"MacBook Pro (14 pulgadas, M4, 2024)","colores":["Plata","Negro espacial"],"capacidades":["512GB","1TB","2TB"]},
  {"modelo":"MacBook Pro (14 pulgadas, M4 Pro o M4 Max, 2024)","colores":["Plata","Negro espacial"],"capacidades":["512GB","1TB","2TB","4TB","8TB"]},
  {"modelo":"MacBook Pro (16 pulgadas, 2024)","colores":["Plata","Negro espacial"],"capacidades":["512GB","1TB","2TB","4TB","8TB"]},
  {"modelo":"MacBook Pro (14 pulgadas, M3, 2023)","colores":["Plata","Gris espacial"],"capacidades":["512GB","1TB","2TB"]},
  {"modelo":"MacBook Pro (14 pulgadas, M3 Pro o M3 Max, 2023)","colores":["Plata","Negro espacial"],"capacidades":["512GB","1TB","2TB","4TB","8TB"]},
  {"modelo":"MacBook Pro (16 pulgadas, noviembre de 2023)","colores":["Plata","Negro espacial"],"capacidades":["512GB","1TB","2TB","4TB","8TB"]},
  {"modelo":"MacBook Pro (14 pulgadas, 2023)","colores":["Plata","Gris espacial"],"capacidades":["512GB","1TB","2TB","4TB","8TB"]},
  {"modelo":"MacBook Pro (16 pulgadas, 2023)","colores":["Plata","Gris espacial"],"capacidades":["512GB","1TB","2TB","4TB","8TB"]},
  {"modelo":"MacBook Pro (13 pulgadas, M2, 2022)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Pro (14 pulgadas, 2021)","colores":["Plata","Gris espacial"],"capacidades":["512GB","1TB","2TB","4TB","8TB"]},
  {"modelo":"MacBook Pro (16 pulgadas, 2021)","colores":["Plata","Gris espacial"],"capacidades":["512GB","1TB","2TB","4TB","8TB"]},
  {"modelo":"MacBook Pro (13 pulgadas, M1, 2020)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Pro (13 pulgadas, 2020, dos puertos Thunderbolt 3)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Pro (13 pulgadas, 2020, cuatro puertos Thunderbolt 3)","colores":["Plata","Gris espacial"],"capacidades":["512GB","1TB","2TB","4TB"]},
  {"modelo":"MacBook Pro (16 pulgadas, 2019)","colores":["Plata","Gris espacial"],"capacidades":["512GB","1TB","2TB","4TB","8TB","3TB"]},
  {"modelo":"MacBook Pro (13 pulgadas, 2019, dos puertos Thunderbolt 3)","colores":["Plata","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Pro (15 pulgadas, 2019)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB","2TB","4TB"]},
  {"modelo":"MacBook Pro (13 pulgadas, 2019, cuatro puertos Thunderbolt 3)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Pro (15 pulgadas, 2018)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB","2TB","4TB"]},
  {"modelo":"MacBook Pro (13 pulgadas, 2018, cuatro puertos Thunderbolt 3)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Pro (15 pulgadas, 2017)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Pro (13 pulgadas, 2017, cuatro puertos Thunderbolt 3)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB"]},
  {"modelo":"MacBook Pro (13 pulgadas, 2017, dos puertos Thunderbolt 3)","colores":["Plata","Gris espacial"],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"MacBook Pro (15 pulgadas, 2016)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB","2TB"]},
  {"modelo":"MacBook Pro (13 pulgadas, 2016, cuatro puertos Thunderbolt 3)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB"]},
  {"modelo":"MacBook Pro (13 pulgadas, 2016, dos puertos Thunderbolt 3)","colores":["Plata","Gris espacial"],"capacidades":["256GB","512GB","1TB"]},
  {"modelo":"MacBook Pro (Retina, 15 pulgadas, mediados de 2015)","colores":[],"capacidades":["256GB","512GB","1TB"]},
  {"modelo":"MacBook Pro (Retina, 13 pulgadas, principios de 2015)","colores":[],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"MacBook Pro (Retina, 15 pulgadas, mediados de 2014)","colores":[],"capacidades":["256GB","512GB","1TB"]},
  {"modelo":"MacBook Pro (Retina, 13 pulgadas, mediados de 2014)","colores":[],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"MacBook Pro (Retina, 15 pulgadas, finales de 2013)","colores":[],"capacidades":["256GB","512GB","1TB"]},
  {"modelo":"MacBook Pro (Retina, 13 pulgadas, finales de 2013)","colores":[],"capacidades":["128GB","256GB","512GB","1TB"]},
  {"modelo":"MacBook Pro (Retina, 15 pulgadas, principios de 2013)","colores":[],"capacidades":["256GB","512GB","768GB"]},
  {"modelo":"MacBook Pro (Retina, 13 pulgadas, principios de 2013)","colores":[],"capacidades":["128GB","256GB","512GB","768GB"]},
  {"modelo":"MacBook Pro (Retina, 13 pulgadas, finales de 2012)","colores":[],"capacidades":["128GB","256GB","512GB","768GB"]},
  {"modelo":"MacBook Pro (Retina, 15 pulgadas, mediados de 2012)","colores":[],"capacidades":[]},
  {"modelo":"MacBook Pro (15 pulgadas, mediados de 2012)","colores":[],"capacidades":[]},
  {"modelo":"MacBook Pro (13 pulgadas, mediados de 2012)","colores":[],"capacidades":[]},
  {"modelo":"MacBook Pro (17 pulgadas, finales de 2011)","colores":[],"capacidades":[]},
  {"modelo":"MacBook Pro (15 pulgadas, finales de 2011)","colores":[],"capacidades":[]},
  {"modelo":"MacBook Pro (13 pulgadas, finales de 2011)","colores":[],"capacidades":[]},
  {"modelo":"MacBook Pro (17 pulgadas, principios de 2011)","colores":[],"capacidades":[]},
  {"modelo":"MacBook Pro (15 pulgadas, principios de 2011)","colores":[],"capacidades":["750GB","500GB","512GB","400GB","200GB","128GB","256GB"]},
  {"modelo":"MacBook Pro (13 pulgadas, principios de 2011)","colores":[],"capacidades":[]},
  {"modelo":"MacBook Pro (17 pulgadas, mediados de 2010)","colores":[],"capacidades":["500GB","512GB","400GB","200GB","128GB","256GB"]},
  {"modelo":"MacBook Pro (15 pulgadas, mediados de 2010)","colores":[],"capacidades":["500GB","512GB","320GB","400GB","200GB","128GB","256GB"]},
  {"modelo":"MacBook Pro (13 pulgadas, mediados de 2010)","colores":[],"capacidades":["320GB","500GB","512GB","250GB","400GB","128GB","256GB"]},
  {"modelo":"MacBook Pro (17 pulgadas, mediados de 2009)","colores":[],"capacidades":["500GB","256GB","400GB","200GB","128GB"]},
  {"modelo":"MacBook Pro (15 pulgadas, mediados de 2009)","colores":[],"capacidades":["500GB","256GB","250GB","320GB","400GB","200GB","128GB"]},
  {"modelo":"MacBook Pro (15 pulgadas; 2,53 GHz, mediados de 2009)","colores":[],"capacidades":[]},
  {"modelo":"MacBook Pro (13 pulgadas, mediados de 2009)","colores":[],"capacidades":["250GB","500GB","256GB","160GB","400GB","320GB","128GB"]},
  {"modelo":"MacBook Pro (17 pulgadas, principios de 2009)","colores":[],"capacidades":["320GB","128GB","256GB","250GB"]},
  {"modelo":"MacBook Pro (15 pulgadas, finales de 2008)","colores":[],"capacidades":[]},
  {"modelo":"MacBook Pro (17 pulgadas, principios de 2008)","colores":[],"capacidades":[]},
  {"modelo":"MacBook Pro (15 pulgadas, principios de 2008)","colores":[],"capacidades":[]}
];

// Sugerencias compartidas. Nunca cambiar valores escritos o históricos.
(function(global) {
  'use strict';
  function clave(v) { return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim(); }
  var porModelo={};
  APPLE_MODELOS.forEach(function(x) { porModelo[clave(x.modelo)]=x; });
  var aliases={'iphone se (1st gen)':'iPhone SE (1.ª generación)','iphone se (2nd gen)':'iPhone SE (2.ª generación)','iphone se (3rd gen)':'iPhone SE (3.ª generación)'};
  function ficha(modelo) {
    var k=clave(modelo).replace(/\s+\d+\s*(gb|tb)\s*$/i,'');
    return porModelo[k] || porModelo[clave(aliases[k])] || null;
  }
  function modelos(q,soloCotizador) {
    var lista=APPLE_MODELOS.map(function(x){return x.modelo;}).concat(global.EQUIPOS_APPLE||[]);
    var vistos={},palabras=clave(q).split(/\s+/).filter(Boolean);
    return lista.filter(function(n) {
      var k=clave(n);if(vistos[k])return false;vistos[k]=true;
      if(soloCotizador && (!/^iphone\b/i.test(n)||!global.MAXPOINT_COTIZADOR.claveModeloBase(n)))return false;
      return palabras.every(function(p){return k.indexOf(p)!==-1;});
    }).sort(function(a,b){return a.localeCompare(b,'es',{numeric:true,sensitivity:'base'});});
  }
  global.appleSugerirModelos=modelos;
  global.appleFichaModelo=ficha;
  if(typeof document==='undefined')return;
  var pares=[['vMod','vCap','vCol'],['sMod','sCap','sCol'],['cotManualModelo','cotManualCapacidad'],['rpMod'],['smModelo'],['vPpMod'],['poModelos']];
  var ligados=new WeakSet();
  function lista(input,opciones) {
    if(!input)return;
    var id='apple-'+input.id,dl=document.getElementById(id);
    if(!dl){dl=document.createElement('datalist');dl.id=id;document.body.appendChild(dl);}
    var firma=opciones.join('\n');
    if(dl.dataset.firma!==firma) {
      dl.textContent='';opciones.forEach(function(v){var o=document.createElement('option');o.value=v;dl.appendChild(o);});dl.dataset.firma=firma;
    }
    input.setAttribute('list',id);input.setAttribute('autocomplete','off');
  }
  function actualizar(par) {
    var mod=document.getElementById(par[0]);if(!mod)return;
    var f=ficha(mod.value),cap=document.getElementById(par[1]),color=document.getElementById(par[2]);
    lista(cap,f ? f.capacidades : []);lista(color,f ? f.colores : []);
    if(cap)cap.setAttribute('aria-description',f?'Capacidades disponibles para '+f.modelo:'Elegí un modelo y su generación para ver capacidades');
    if(color)color.setAttribute('aria-description',f?'Colores disponibles para '+f.modelo:'Elegí un modelo y su generación para ver colores');
  }
  function partePago(input) {
    var f=APPLE_MODELOS.find(function(x){return clave(input.value).indexOf(clave(x.modelo)+' ')===0 && ficha(input.value.split(/\s+\d+\s*(?:GB|TB)/i)[0])===x;});
    if(!f) { lista(input,modelos(input.value).slice(0,40));return; }
    var cap=(input.value.match(/\b(\d+)\s*(GB|TB)\b/i)||[]);
    var capacidades=cap.length?[cap[1]+cap[2].toUpperCase()]:f.capacidades;
    var opciones=[];
    capacidades.forEach(function(c){f.colores.forEach(function(color){opciones.push(f.modelo+' '+c+' '+color);});});
    lista(input,opciones.slice(0,40));
  }
  function modelosCompatibles(input) {
    var partes=input.value.split(','),ultimo=partes.pop(),previos=partes.map(function(x){return x.trim();}).filter(Boolean);
    var prefijo=previos.length ? previos.join(', ')+', ' : '';
    var usados=previos.map(clave);
    lista(input,modelos(ultimo).filter(function(m){return usados.indexOf(clave(m))===-1;}).slice(0,40).map(function(m){return prefijo+m;}));
  }
  global.applePrepararSugerencias=function() {
    pares.forEach(function(par) {
      var mod=document.getElementById(par[0]);if(!mod)return;
      if(!ligados.has(mod)) {
        ligados.add(mod);
        lista(mod,modelos('',par[0]==='cotManualModelo'));
        mod.addEventListener('input',function(){actualizar(par);if(par[0]==='vPpMod')partePago(mod);if(par[0]==='poModelos')modelosCompatibles(mod);});
        mod.addEventListener('change',function(){actualizar(par);});
        mod.addEventListener('focus',function(){if(par[0]==='vPpMod')partePago(mod);if(par[0]==='poModelos')modelosCompatibles(mod);});
      }
      actualizar(par);
    });
  };
  document.addEventListener('focusin',function(e){pares.forEach(function(par){if(par.indexOf(e.target.id)!==-1)actualizar(par);});});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',global.applePrepararSugerencias);else global.applePrepararSugerencias();
  // Los servicios y sus modales se construyen al abrirlos.
  if(typeof MutationObserver!=='undefined')new MutationObserver(function(ms){
    if(ms.some(function(m){return Array.from(m.addedNodes).some(function(n){return n.nodeType===1 && (n.matches('input')||n.querySelector('input'));});}))global.applePrepararSugerencias();
  }).observe(document.body,{childList:true,subtree:true});
})(window);
