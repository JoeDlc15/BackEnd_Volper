const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const prisma = new PrismaClient();

async function importData() {
    console.log('🚀 Iniciando actualización/agregación de productos...');

    try {
        // La ruta debe ser relativa al directorio donde se ejecuta el script o absoluta
        const excelPath = path.join(process.cwd(), 'data/productos_volper.xlsx');
        console.log(`📂 Leyendo archivo: ${excelPath}`);

        const workbook = xlsx.readFile(excelPath);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        console.log(`📊 Total de filas encontradas: ${data.length}`);

        for (const [index, row] of data.entries()) {
            const nombre = row.nombre ? String(row.nombre).trim() : null;
            const sku = row.sku ? String(row.sku).trim() : null;

            if (!nombre || !sku) {
                console.warn(`⚠️ Fila ${index + 2} saltada: Nombre o SKU faltante.`);
                continue;
            }

            try {
                // 1. Buscamos o creamos el producto base (Usamos findFirst para mayor flexibilidad)
                let product = await prisma.product.findFirst({
                    where: { name: nombre }
                });

                if (!product) {
                    product = await prisma.product.create({
                        data: {
                            name: nombre,
                            description: row.descripcion || '',
                            categoryId: parseInt(row.cat_id) || 1, // Por defecto cat 1 si no hay
                            images: {
                                create: row.img_urls ? row.img_urls.split(',').map((url, i) => ({
                                    url: url.trim(), isPrimary: i === 0, order: i
                                })) : []
                            }
                        }
                    });
                    console.log(`🆕 CREADO: [Producto] ${nombre}`);
                } else {
                    // Opcional: Actualizar descripción o categoría si ya existe
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            description: row.descripcion || product.description,
                            categoryId: parseInt(row.cat_id) || product.categoryId
                        }
                    });
                }

                // 2. Manejamos la VARIANTE (SKU) con Upsert
                const variantData = {
                    name: row.nombreVariant ? String(row.nombreVariant).trim() : null,
                    price: parseFloat(row.precio_var) || 0,
                    stock: parseInt(row.stock) || 0,
                    barcode: row.barcode ? String(row.barcode).trim() : '',
                    material: row.material || 'Bronce',
                    measureType: row.measureType || 'Pulgada',
                    productId: product.id
                    // minStock se queda con el default del modelo si no se pasa
                };

                await prisma.productVariant.upsert({
                    where: { sku: sku },
                    update: {
                        name: variantData.name,
                        price: variantData.price,
                        stock: variantData.stock,
                        barcode: variantData.barcode
                    },
                    create: {
                        sku: sku,
                        ...variantData,
                        minStock: parseInt(row.min_stock) || 5,
                        dimensions: {
                            create: [
                                ...(row.dim1_n ? [{ dimensionName: row.dim1_n, dimensionValue: String(row.dim1_v), displayOrder: 1 }] : []),
                                ...(row.dim2_n ? [{ dimensionName: row.dim2_n, dimensionValue: String(row.dim2_v), displayOrder: 2 }] : []),
                                ...(row.dim3_n ? [{ dimensionName: row.dim3_n, dimensionValue: String(row.dim3_v), displayOrder: 3 }] : []),
                            ]
                        }
                    }
                });

                console.log(`   ✅ SKU PROCESADO: ${sku}`);

            } catch (rowError) {
                console.error(`❌ Error en fila ${index + 2} (${nombre}):`, rowError.message);
            }
        }

        console.log('✨ Importación masiva finalizada con éxito.');

    } catch (error) {
        console.error('❌ Error crítico durante la importación:', error);
    } finally {
        await prisma.$disconnect();
    }
}

importData();