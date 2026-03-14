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

// Configuración de WebSockets (Socket.io)
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Ajusta esto a tu dominio de producción
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado al WebSocket:', socket.id);

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

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

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor HTTP y WebSocket corriendo en http://localhost:${PORT}`);
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

// --- GESTIÓN DE CLIENTES ---

app.get('/api/admin/customers', authenticateAdmin, async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(customers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener clientes" });
    }
});

app.post('/api/admin/customers', authenticateAdmin, async (req, res) => {
    try {
        const { name, company, email, phone, address, notes } = req.body;
        const customer = await prisma.customer.create({
            data: { name, company, email, phone, address, notes }
        });
        res.status(201).json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear cliente" });
    }
});

app.put('/api/admin/customers/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, company, email, phone, address, notes } = req.body;
        const customer = await prisma.customer.update({
            where: { id: parseInt(id) },
            data: { name, company, email, phone, address, notes }
        });
        res.json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar cliente" });
    }
});

// --- MOVIMIENTOS DE INVENTARIO (KARDEX) ---

app.get('/api/admin/movements', authenticateAdmin, async (req, res) => {
    try {
        const movements = await prisma.inventoryMovement.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                product: { select: { name: true } },
                variant: { select: { sku: true } }
            }
        });
        res.json(movements);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener movimientos" });
    }
});

app.post('/api/admin/movements', authenticateAdmin, async (req, res) => {
    try {
        const { movementType, quantity, variantId, productId, reason, reference, supplier, unitCost } = req.body;

        // 1. Obtener stock actual
        const variant = await prisma.productVariant.findUnique({
            where: { id: parseInt(variantId) }
        });

        if (!variant) return res.status(404).json({ error: "Variante no encontrada" });

        const prevStock = variant.stock;
        let newStock = prevStock;

        if (['entrada', 'ajuste', 'devolucion'].includes(movementType)) {
            newStock += parseInt(quantity);
        } else {
            newStock -= parseInt(quantity);
        }

        // 2. Transacción: Actualizar stock y registrar movimiento
        const [updatedVariant, movement] = await prisma.$transaction([
            prisma.productVariant.update({
                where: { id: parseInt(variantId) },
                data: { stock: newStock }
            }),
            prisma.inventoryMovement.create({
                data: {
                    movementType,
                    quantity: parseInt(quantity),
                    previousStock: prevStock,
                    resultingStock: newStock,
                    reason,
                    reference,
                    supplier,
                    unitCost: unitCost ? parseFloat(unitCost) : null,
                    totalCost: unitCost ? parseFloat(unitCost) * parseInt(quantity) : null,
                    productId: parseInt(productId),
                    variantId: parseInt(variantId)
                }
            })
        ]);

        res.status(201).json({ success: true, movement, updatedVariant });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al registrar movimiento o actualizar stock" });
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

        // --- Sincronización automática con el directorio de clientes ---
        if (email) {
            try {
                await prisma.customer.upsert({
                    where: { email: email },
                    update: {
                        name: contact,
                        company: company || undefined,
                        phone: phone || undefined,
                        notes: `Cliente actualizado vía cotización el ${new Date().toLocaleString()}`
                    },
                    create: {
                        name: contact,
                        company: company || null,
                        email: email,
                        phone: phone || null,
                        notes: `Cliente registrado automáticamente vía catálogo el ${new Date().toLocaleString()}`
                    }
                });
            } catch (customerError) {
                console.error('Error al sincronizar cliente:', customerError);
                // No bloqueamos la respuesta de la cotización si falla el registro del cliente
            }
        }

        // --- Emitir notificación en tiempo real (WebSocket) ---
        // Emitimos la cotización recién creada (incluyendo items)
        io.emit('new-quote', cotizacion);

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