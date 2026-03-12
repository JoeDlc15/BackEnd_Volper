require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const AUTH_SECRET = process.env.AUTH_SECRET || 'volper_secret_2024_key';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: '*', // Permitir peticiones desde cualquier origen (localtunnel, ngrok, localhost)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'vscode-browser-req', 'Bypass-Tunnel-Reminder', 'ngrok-skip-browser-warning']
}));
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        mensaje: "API de Volper Seal funcionando correctamente",
        status: "online",
        fecha: new Date().toLocaleString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Middleware de autenticación para rutas de administración
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Acceso denegado. Token no proporcionado." });

    jwt.verify(token, AUTH_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido o expirado." });
        req.user = user;
        next();
    });
};

// Rutas de Autenticación
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const admin = await prisma.adminUser.findUnique({
            where: { username }
        });

        if (!admin) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            AUTH_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                username: admin.username,
                role: admin.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor durante el login" });
    }
});

// Rutas de Administración (Protegidas)
app.get('/api/admin/cotizaciones', authenticateAdmin, async (req, res) => {
    try {
        const cotizaciones = await prisma.quoteRequest.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { items: true }
                }
            }
        });
        res.json(cotizaciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener cotizaciones" });
    }
});

app.get('/api/admin/cotizaciones/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const cotizacion = await prisma.quoteRequest.findUnique({
            where: { id: parseInt(id) },
            include: {
                items: true
            }
        });

        if (!cotizacion) {
            return res.status(404).json({ error: "Cotización no encontrada" });
        }

        res.json(cotizacion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener la cotización" });
    }
});

// Actualizar información general de un producto
app.put('/api/admin/productos/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, categoryId } = req.body;

        const producto = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                categoryId: categoryId ? parseInt(categoryId) : undefined
            }
        });

        res.json(producto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar el producto" });
    }
});

// Actualizar información de una variante (precio, stock, etc)
app.put('/api/admin/variantes/:sku', authenticateAdmin, async (req, res) => {
    try {
        const { sku } = req.params;
        const { price, stock } = req.body;

        const variante = await prisma.productVariant.update({
            where: { sku },
            data: {
                price: price !== undefined ? parseFloat(price) : undefined,
                stock: stock !== undefined ? parseInt(stock) : undefined
            }
        });

        res.json(variante);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar la variante" });
    }
});

// Obtener todos los productos con sus categorías y variantes de medidas
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await prisma.product.findMany({
            orderBy: [
                { category: { displayOrder: 'asc' } },
                { displayOrder: 'asc' },
                { name: 'asc' }
            ],
            include: {
                images: {
                    orderBy: {
                        order: 'asc'
                    }
                },
                category: true,
                variants: {
                    include: {
                        dimensions: {
                            orderBy: {
                                displayOrder: 'asc'
                            }
                        }
                    }
                }
            }
        });
        res.json(productos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los productos" });
    }
});

// Obtener un producto por ID
app.get('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const producto = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
                images: {
                    orderBy: {
                        order: 'asc'
                    }
                },
                category: true,
                variants: {
                    include: {
                        dimensions: {
                            orderBy: {
                                displayOrder: 'asc'
                            }
                        }
                    }
                }
            }
        });

        if (!producto) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        res.json(producto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el producto" });
    }
});

// Crear una nueva cotización
app.post('/api/cotizaciones', async (req, res) => {
    try {
        const { company, contact, phone, email, items } = req.body;

        const cotizacion = await prisma.quoteRequest.create({
            data: {
                company,
                contact,
                phone,
                email,
                items: {
                    create: items.map(item => ({
                        productName: item.name,
                        sku: item.variants?.[0]?.sku || 'N/A',
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            },
            include: {
                items: true
            }
        });

        res.status(201).json(cotizacion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear la cotización" });
    }
});

// Registrar visualización única de un producto (por IP)
app.post('/api/productos/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);

        // Obtener la IP del visitante (compatible con proxies/ngrok/localtunnel)
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.connection?.remoteAddress
            || req.socket?.remoteAddress
            || '0.0.0.0';

        // Intentar crear el registro. Si ya existe (misma IP + producto), no hacer nada
        const existingView = await prisma.productView.findUnique({
            where: {
                ip_productId: { ip, productId }
            }
        });

        if (!existingView) {
            // Primera vez que este IP ve este producto → registrar y sumar 1
            await prisma.productView.create({
                data: { ip, productId }
            });

            await prisma.product.update({
                where: { id: productId },
                data: { viewCount: { increment: 1 } }
            });
        }

        // Devolver el conteo actualizado
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { viewCount: true }
        });

        res.json({ viewCount: product?.viewCount || 0 });
    } catch (error) {
        console.error('Error registrando vista:', error);
        res.status(500).json({ error: "Error al registrar la visualización" });
    }
});