// BackEnd/prisma/seed.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando carga de datos de prueba...');

    // 1. Limpiar datos existentes
    await prisma.inventoryMovement.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.variantDimension.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productView.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    // 2. Crear Categorías
    const catBronce = await prisma.category.create({
        data: {
            name: 'Conexiones de Bronce',
            slug: 'conexiones-bronce',
            displayOrder: 1,
        },
    });

    const catEmpaques = await prisma.category.create({
        data: {
            name: 'Empaquetaduras de Motor',
            slug: 'empaquetaduras-motor',
            displayOrder: 2,
        },
    });

    // ============================================
    // PRODUCTOS DE BRONCE
    // ============================================

    // --- TEE UNION BRONCE ---
    await prisma.product.create({
        data: {
            name: 'Tee Union Bronce',
            description: 'Tee de bronce forjado para alta presión.',
            price: 15.50,
            displayOrder: 1,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1772711424/TeeUnionArmada_vkkxmm.png', isPrimary: true, order: 0 },
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1772971147/tee_desarmado_n2lh8i.png', isPrimary: false, order: 1 },
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1772971156/Multiple_tee_sxphqd.png', isPrimary: false, order: 2 }
                ]
            },
            categoryId: catBronce.id,
            variants: {
                create: [
                    {
                        sku: 'TEE-BR-12-12-14',
                        barcode: 'VS-10001',
                        name: 'Tee Union Bronce 1/2" x 1/2" x 1/4"',
                        price: 15.50,
                        stock: 50,
                        minStock: 10,
                        unit: 'pza',
                        material: 'Bronce',
                        measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Lado A', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Lado B', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 2 },
                                { dimensionName: 'Centro', dimensionValue: '1/4"', measureUnit: 'Pulgada', displayOrder: 3 },
                            ]
                        }
                    },
                    {
                        sku: 'TEE-BR-12-12-12',
                        barcode: 'VS-10002',
                        name: 'Tee Union Bronce 1/2" x 1/2" x 1/2"',
                        price: 18.00,
                        stock: 30,
                        material: 'Bronce',
                        measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Lado A', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Lado B', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 2 },
                                { dimensionName: 'Centro', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 3 },
                            ]
                        }
                    }
                ]
            }
        }
    });

    // --- UNIÓN ARMADA (Pulgada) ---
    await prisma.product.create({
        data: {
            name: 'Unión Armada',
            description: 'Unión para conexiones hidráulicas.',
            price: 22.80,
            displayOrder: 2,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1772710718/unionArmada_s2wmii.png', isPrimary: true, order: 0 },
                    { url: 'https://images.unsplash.com/photo-1611078564883-8a033f6a6b57?q=80&w=400', isPrimary: false, order: 1 }
                ]
            },
            categoryId: catBronce.id,
            variants: {
                create: [
                    {
                        sku: 'UN-ARM-18-18', barcode: '1-020020',
                        name: 'Unión Armada 1/8" x 1/8"', price: 8.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '1/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '1/8"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-ARM-532-532', barcode: '1-025025',
                        name: 'Unión Armada 5/32" x 5/32"', price: 9.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '5/32"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '5/32"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-ARM-316-316', barcode: '1-030030',
                        name: 'Unión Armada 3/16" x 3/16"', price: 9.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '3/16"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '3/16"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-ARM-14-14', barcode: '1-040040',
                        name: 'Unión Armada 1/4" x 1/4"', price: 12.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '1/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '1/4"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-ARM-516-516', barcode: '1-050050',
                        name: 'Unión Armada 5/16" x 5/16"', price: 14.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '5/16"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '5/16"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-ARM-38-38', barcode: '1-060060',
                        name: 'Unión Armada 3/8" x 3/8"', price: 16.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '3/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '3/8"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-ARM-12-12', barcode: '1-080080',
                        name: 'Unión Armada 1/2" x 1/2"', price: 22.80,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-ARM-58-58', barcode: '1-100100',
                        name: 'Unión Armada 5/8" x 5/8"', price: 28.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '5/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '5/8"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-ARM-34-34', barcode: '1-120120',
                        name: 'Unión Armada 3/4" x 3/4"', price: 35.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '3/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '3/4"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                    // --- Variantes Milimétricas del mismo producto ---
                    {
                        sku: 'UN-ARM-M6', barcode: '1-290606',
                        name: 'Unión Armada M6', price: 10.00,
                        stock: 80, material: 'Bronce', measureType: 'Milimétrico',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: 'M6', measureUnit: 'Milimétrico', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: 'M6', measureUnit: 'Milimétrico', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-ARM-M8', barcode: '1-290808',
                        name: 'Unión Armada M8', price: 12.00,
                        stock: 80, material: 'Bronce', measureType: 'Milimétrico',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: 'M8', measureUnit: 'Milimétrico', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: 'M8', measureUnit: 'Milimétrico', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-ARM-M10', barcode: '1-291010',
                        name: 'Unión Armada M10', price: 15.00,
                        stock: 80, material: 'Bronce', measureType: 'Milimétrico',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: 'M10', measureUnit: 'Milimétrico', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: 'M10', measureUnit: 'Milimétrico', displayOrder: 2 },
                            ]
                        }
                    },
                ]
            }
        }
    });

    // --- UNIÓN ARMADA MIXTA ---
    await prisma.product.create({
        data: {
            name: 'Unión Armada Mixta',
            description: 'Unión para conexiones hidráulicas con medidas diferentes en cada extremo.',
            price: 15.90,
            displayOrder: 3,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1773319057/unionArmadaMixta_obkepc.png', isPrimary: true, order: 0 },
                    { url: 'https://images.unsplash.com/photo-1611078564883-8a033f6a6b57?q=80&w=400', isPrimary: false, order: 1 }
                ]
            },
            categoryId: catBronce.id,
            variants: {
                create: [
                    {
                        sku: 'UN-MIX-14-18', barcode: '2-040020',
                        name: 'Unión Mixta 1/4" x 1/8"', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '1/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '1/8"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-MIX-12-38', barcode: '2-080060',
                        name: 'Unión Mixta 1/2" x 3/8"', price: 18.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '3/8"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'UN-MIX-58-12', barcode: '2-100080',
                        name: 'Unión Mixta 5/8" x 1/2"', price: 25.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Rosca A', dimensionValue: '5/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Rosca B', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 2 },
                            ]
                        }
                    },
                ]
            }
        }
    });

    // --- CONO BRONCE ---
    await prisma.product.create({
        data: {
            name: 'Cono Bronce',
            description: 'Cono para tubo de cobre, material bronce.',
            price: 5.90,
            displayOrder: 4,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1773319056/Cono_uc38ro.png', isPrimary: true, order: 0 },
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1773319057/ConoMilemetrico_qqo2af.png', isPrimary: false, order: 1 }
                ]
            },
            categoryId: catBronce.id,
            variants: {
                create: [
                    {
                        sku: 'CONO-PULG-18', barcode: '3-000020',
                        name: 'Cono Pulg 1/8"', price: 3.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONO-PULG-14', barcode: '3-000035',
                        name: 'Cono Pulg 1/4"', price: 4.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONO-PULG-38', barcode: '3-000045',
                        name: 'Cono Pulg 3/8"', price: 5.90,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '3/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONO-PULG-12', barcode: '3-000055',
                        name: 'Cono Pulg 1/2"', price: 7.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONO-PULG-58', barcode: '3-000060',
                        name: 'Cono Pulg 5/8"', price: 9.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '5/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONO-PULG-34', barcode: '3-000065',
                        name: 'Cono Pulg 3/4"', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '3/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONO-M6', barcode: '3-000070',
                        name: 'Cono M6', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M6', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONO-M8', barcode: '3-000075',
                        name: 'Cono M8', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M8', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONO-M10', barcode: '3-000080',
                        name: 'Cono M10', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M10', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONO-M12', barcode: '3-000085',
                        name: 'Cono M12', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M12', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                ]
            }
        }
    });

    // --- GUIAS O CLAVIJAS ---
    await prisma.product.create({
        data: {
            name: 'Guia o Clavija',
            description: 'Guia de bronce',
            price: 5.90,
            displayOrder: 5,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1773319057/GuiaClavija_h0y3pd.png', isPrimary: true, order: 0 },
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1773319057/GuiaClavijaMilimetrico_qewrun.png', isPrimary: false, order: 1 }
                ]
            },
            categoryId: catBronce.id,
            variants: {
                create: [
                    {
                        sku: 'GUIA-18', barcode: '4-000020',
                        name: 'Guia 1/8"', price: 3.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'GUIA-14', barcode: '4-000035',
                        name: 'Guia 1/4"', price: 4.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'GUIA-38', barcode: '4-000045',
                        name: 'Guia 3/8"', price: 5.90,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '3/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'GUIA-12', barcode: '4-000055',
                        name: 'Guia 1/2"', price: 7.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'GUIA-58', barcode: '4-000060',
                        name: 'Guia 5/8"', price: 9.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '5/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'GUIA-34', barcode: '4-000065',
                        name: 'Guia 3/4"', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '3/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'GUIA-M6', barcode: '4-000070',
                        name: 'Guia M6', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M6', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'GUIA-M8', barcode: '4-000075',
                        name: 'Guia M8', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M8', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'GUIA-M10', barcode: '4-000080',
                        name: 'Guia M10', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M10', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'GUIA-M12', barcode: '4-000085',
                        name: 'Guia M12', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M12', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                ]
            }
        }
    });

    // --- TUERCA BRONCE ---
    await prisma.product.create({
        data: {
            name: 'Tuerca Union Cañeria',
            description: 'Tuerca para union de cañeria, material bronce.',
            price: 5.90,
            displayOrder: 6,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1773319057/Tuerca_hds0uw.png', isPrimary: true, order: 0 },
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1773319057/TuercaMilimetrico_giyud3.png', isPrimary: false, order: 1 }
                ]
            },
            categoryId: catBronce.id,
            variants: {
                create: [
                    {
                        sku: 'TUERCA-18', barcode: '5-000020',
                        name: 'Tuerca 1/8"', price: 3.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'TUERCA-14', barcode: '5-000035',
                        name: 'Tuerca 1/4"', price: 4.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'TUERCA-38', barcode: '5-000045',
                        name: 'Tuerca 3/8"', price: 5.90,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '3/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'TUERCA-12', barcode: '5-000055',
                        name: 'Tuerca 1/2"', price: 7.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'TUERCA-58', barcode: '5-000060',
                        name: 'Tuerca 5/8"', price: 9.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '5/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'TUERCA-34', barcode: '5-000065',
                        name: 'Tuerca 3/4"', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '3/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'TUERCA-M6', barcode: '5-000070',
                        name: 'Tuerca M6', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M6', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'TUERCA-M8', barcode: '5-000075',
                        name: 'Tuerca M8', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M8', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'TUERCA-M10', barcode: '5-000080',
                        name: 'Tuerca M10', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M10', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'TUERCA-M12', barcode: '5-000085',
                        name: 'Tuerca M12', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M12', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                ]
            }
        }
    });

    // --- CONTRATUERCA BRONCE ---
    await prisma.product.create({
        data: {
            name: 'Contratuerca Hilo Fino',
            description: 'Contratuerca para union de cañeria, material bronce.',
            price: 5.90,
            displayOrder: 7,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1773319056/Contratuerca_kxm2cp.png', isPrimary: true, order: 0 },
                    { url: 'https://images.unsplash.com/photo-1611078564883-8a033f6a6b57?q=80&w=400', isPrimary: false, order: 1 }
                ]
            },
            categoryId: catBronce.id,
            variants: {
                create: [
                    {
                        sku: 'CONTRATUERCA-18', barcode: '6-000020',
                        name: 'Contratuerca 1/8"', price: 3.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONTRATUERCA-14', barcode: '6-000035',
                        name: 'Contratuerca 1/4"', price: 4.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONTRATUERCA-38', barcode: '6-000045',
                        name: 'Contratuerca 3/8"', price: 5.90,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '3/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONTRATUERCA-12', barcode: '6-000055',
                        name: 'Contratuerca 1/2"', price: 7.50,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONTRATUERCA-58', barcode: '6-000060',
                        name: 'Contratuerca 5/8"', price: 9.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '5/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONTRATUERCA-34', barcode: '6-000065',
                        name: 'Contratuerca 3/4"', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: '3/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                            ]
                        }
                    }
                ]
            }
        }
    });

    // --- CONTRATUERCA CON ASIENTO ORING BRONCE ---
    await prisma.product.create({
        data: {
            name: 'Contratuerca Milimetrica c/ Asiento Oring',
            description: 'Contratuerca para union de cañeria, material bronce.',
            price: 11.00,
            displayOrder: 8,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1771416771/Contratuerca_ejsmmo.png', isPrimary: true, order: 0 },
                    { url: 'https://images.unsplash.com/photo-1611078564883-8a033f6a6b57?q=80&w=400', isPrimary: false, order: 1 }
                ]
            },
            categoryId: catBronce.id,
            variants: {
                create: [
                    {
                        sku: 'CONTRATUERCA-MM10', barcode: '7-000020',
                        name: 'Contratuerca M10', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M10', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONTRATUERCA-MM12', barcode: '7-000035',
                        name: 'Contratuerca M12', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M12', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONTRATUERCA-MM14', barcode: '7-000055',
                        name: 'Contratuerca M14', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M14', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONTRATUERCA-MM16', barcode: '7-000060',
                        name: 'Contratuerca M16', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M16', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    },
                    {
                        sku: 'CONTRATUERCA-MM22', barcode: '7-000065',
                        name: 'Contratuerca M22', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Milimetrica',
                        dimensions: {
                            create: [
                                { dimensionName: 'Diámetro', dimensionValue: 'M22', measureUnit: 'Milimetrica', displayOrder: 1 },
                            ]
                        }
                    }
                ]
            }
        }
    });

    // --- CONECTOR RECTO ARMADO Cañeria - NPT ---
    await prisma.product.create({
        data: {
            name: 'CONECTOR RECTO ARMADO',
            description: 'Conector recto armado para union de cañeria, material bronce.',
            price: 11.00,
            displayOrder: 9,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/dpn43zprq/image/upload/v1773319057/Conector_Recto_sbkpaf.png', isPrimary: true, order: 0 },
                    { url: 'https://images.unsplash.com/photo-1611078564883-8a033f6a6b57?q=80&w=400', isPrimary: false, order: 1 }
                ]
            },
            categoryId: catBronce.id,
            variants: {
                create: [
                    {
                        sku: 'CONETOR-18-116', barcode: '8-000020',
                        name: 'Conector 1/8"-1/16 NPT', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada-NPT',
                        dimensions: {
                            create: [
                                { dimensionName: 'Lado A', dimensionValue: '1/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Lado B', dimensionValue: '1/16 NPT', measureUnit: 'NPT', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'CONETOR-532-116', barcode: '8-000035',
                        name: 'Conector 5/32"-1/16 NPT', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada-NPT',
                        dimensions: {
                            create: [
                                { dimensionName: 'Lado A', dimensionValue: '5/32"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Lado B', dimensionValue: '1/16 NPT', measureUnit: 'NPT', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'CONETOR-316-116', barcode: '8-000045',
                        name: 'Conector 3/16"-1/16 NPT', price: 5.90,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada-NPT',
                        dimensions: {
                            create: [
                                { dimensionName: 'Lado A', dimensionValue: '3/16"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Lado B', dimensionValue: '1/16 NPT', measureUnit: 'NPT', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'CONETOR-14-116', barcode: '8-000055',
                        name: 'Conector 1/4"-1/16 NPT', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada-NPT',
                        dimensions: {
                            create: [
                                { dimensionName: 'Lado A', dimensionValue: '1/4"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Lado B', dimensionValue: '1/16 NPT', measureUnit: 'NPT', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'CONETOR-18-18', barcode: '8-000060',
                        name: 'Conector 1/8"-1/8 NPT', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada-NPT',
                        dimensions: {
                            create: [
                                { dimensionName: 'Lado A', dimensionValue: '1/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Lado B', dimensionValue: '1/8 NPT', measureUnit: 'NPT', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'CONETOR-18-14', barcode: '8-000065',
                        name: 'Conector 1/8"-1/4 NPT', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada-NPT',
                        dimensions: {
                            create: [
                                { dimensionName: 'Lado A', dimensionValue: '1/8"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Lado B', dimensionValue: '1/4 NPT', measureUnit: 'NPT', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'CONETOR-532-18', barcode: '8-000065',
                        name: 'Conector 5/32"-1/8 NPT', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada-NPT',
                        dimensions: {
                            create: [
                                { dimensionName: 'Lado A', dimensionValue: '5/32"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Lado B', dimensionValue: '1/8 NPT', measureUnit: 'NPT', displayOrder: 2 },
                            ]
                        }
                    },
                    {
                        sku: 'CONETOR-532-14', barcode: '8-000065',
                        name: 'Conector 5/32"-1/4 NPT', price: 11.00,
                        stock: 100, material: 'Bronce', measureType: 'Pulgada-NPT',
                        dimensions: {
                            create: [
                                { dimensionName: 'Lado A', dimensionValue: '5/32"', measureUnit: 'Pulgada', displayOrder: 1 },
                                { dimensionName: 'Lado B', dimensionValue: '1/4 NPT', measureUnit: 'NPT', displayOrder: 2 },
                            ]
                        }
                    },

                ]
            }
        }
    });

    // ============================================
    // PRODUCTOS DE EMPAQUETADURAS
    // ============================================

    await prisma.product.create({
        data: {
            name: 'Empaquetadura de Culata',
            description: 'Sello de alta resistencia para bloque de motor.',
            price: 45.00,
            displayOrder: 1,
            images: {
                create: [
                    { url: 'https://png.pngtree.com/png-clipart/20231109/original/pngtree-head-gasket-part-picture-image_13242505.png', isPrimary: true, order: 0 },
                    { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=400', isPrimary: false, order: 1 }
                ]
            },
            categoryId: catEmpaques.id,
            variants: {
                create: [
                    {
                        sku: 'EMP-CUL-MET-001', barcode: 'VS-30001',
                        name: 'Empaquetadura Culata Metal 1.2mm', price: 45.00,
                        stock: 15, material: 'Metal', measureType: 'Milimétrico',
                        dimensions: {
                            create: [
                                { dimensionName: 'Espesor', dimensionValue: '1.2mm', measureUnit: 'Milimétrico', displayOrder: 1 }
                            ]
                        }
                    },
                    {
                        sku: 'EMP-CUL-GRA-001', barcode: 'VS-30002',
                        name: 'Empaquetadura Culata Grafito 1.5mm', price: 52.00,
                        stock: 25, material: 'Grafito', measureType: 'Milimétrico',
                        dimensions: {
                            create: [
                                { dimensionName: 'Espesor', dimensionValue: '1.5mm', measureUnit: 'Milimétrico', displayOrder: 1 }
                            ]
                        }
                    }
                ]
            }
        }
    });

    await prisma.product.create({
        data: {
            name: 'Arandela de Sello Motor',
            description: 'Arandelas técnicas para evitar fugas de aceite.',
            price: 0.80,
            displayOrder: 2,
            images: {
                create: [
                    { url: 'https://w7.pngwing.com/pngs/993/1019/png-transparent-washer-arruelas-stampfix-industria-de-arruelas-e-artefatos-de-metais-industry-household-hardware-lock-others-company-industry-circle.png', isPrimary: true, order: 0 },
                    { url: 'https://images.unsplash.com/photo-1588602684803-db376ca9b66c?q=80&w=400', isPrimary: false, order: 1 }
                ]
            },
            categoryId: catEmpaques.id,
            variants: {
                create: [
                    {
                        sku: 'ARA-COB-12', barcode: 'VS-40001',
                        name: 'Arandela Sello Cobre 1/2"', price: 0.80,
                        stock: 500, material: 'Cobre', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Medida', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 1 }
                            ]
                        }
                    },
                    {
                        sku: 'ARA-ALU-12', barcode: 'VS-40002',
                        name: 'Arandela Sello Aluminio 1/2"', price: 0.60,
                        stock: 300, material: 'Aluminio', measureType: 'Pulgada',
                        dimensions: {
                            create: [
                                { dimensionName: 'Medida', dimensionValue: '1/2"', measureUnit: 'Pulgada', displayOrder: 1 }
                            ]
                        }
                    }
                ]
            }
        }
    });

    // 3. Crear Usuario Administrador por defecto
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.adminUser.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedPassword,
            role: 'admin'
        }
    });

    // 4. Crear Clientes de prueba
    await prisma.customer.create({
        data: {
            name: 'Juan Pérez',
            company: 'Constructora Alfa',
            email: 'juan.perez@alfa.com',
            phone: '+51 987654321',
            address: 'Av. Las Gardenias 456, Lima',
            notes: 'Cliente recurrente de conexiones de bronce.'
        }
    });

    await prisma.customer.create({
        data: {
            name: 'María García',
            company: 'Mecánica Express',
            email: 'mgarcia@mecanica.com',
            phone: '+51 912345678',
            address: 'Calle Los Robles 123, Arequipa',
            notes: 'Interesada en empaquetaduras de motor.'
        }
    });

    // 5. Crear Cotizaciones de prueba
    await prisma.quoteRequest.create({
        data: {
            company: 'Constructora Alfa',
            contact: 'Juan Pérez',
            phone: '+51 987654321',
            email: 'juan.perez@alfa.com',
            status: 'pending',
            items: {
                create: [
                    { productName: 'Tee Union Bronce', sku: 'TEE-BR-12-12-14', quantity: 10, price: 15.50 },
                    { productName: 'Unión Armada', sku: 'UN-ARM-14-14', quantity: 20, price: 12.00 }
                ]
            }
        }
    });

    await prisma.quoteRequest.create({
        data: {
            company: 'Mecánica Express',
            contact: 'María García',
            phone: '+51 912345678',
            email: 'mgarcia@mecanica.com',
            status: 'processed',
            items: {
                create: [
                    { productName: 'Empaquetadura de Culata', sku: 'EMP-CUL-MET-001', quantity: 2, price: 45.00 }
                ]
            }
        }
    });

    console.log('Usuario administrador creado/verificado.');
    console.log('Clientes creados.');
    console.log('Datos cargados exitosamente.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });