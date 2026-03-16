require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const AUTH_SECRET = process.env.AUTH_SECRET || 'volper_secret_2024_key';

const formatQuoteId = (id) => `COT-${String(id).padStart(5, '0')}`;
const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// Ruta de prueba inmediata
app.get('/api/test-debug', (req, res) => res.json({ status: 'ok', message: 'Backend actualizado' }));

// Configuración de WebSockets (Socket.io)
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL,
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
    origin: FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'vscode-browser-req', 'Bypass-Tunnel-Reminder', 'ngrok-skip-browser-warning']
}));
app.use(express.json());

// Middleware de autenticación para rutas de administración
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Acceso denegado. Token no proporcionado." });

    jwt.verify(token, AUTH_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido o expirado." });
        if (user.role !== 'admin') return res.status(403).json({ error: "Acceso denegado. Se requiere rol de administrador." });
        req.user = user;
        next();
    });
};

// Middleware de autenticación para clientes
const authenticateCustomer = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Acceso denegado. Token no proporcionado." });

    jwt.verify(token, AUTH_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token de cliente inválido o expirado." });
        if (user.role !== 'customer') return res.status(403).json({ error: "Acceso denegado. Tipo de usuario incorrecto." });
        req.user = user;
        next();
    });
};

// --- RUTAS PÚBLICAS ---
app.get('/', (req, res) => {
    res.json({
        mensaje: "API de Volper Seal funcionando correctamente",
        status: "online",
        fecha: new Date().toLocaleString()
    });
});

// --- RUTAS DE AUTENTICACIÓN (ADMIN) ---
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

// --- RUTAS DE AUTENTICACIÓN (CLIENTE) ---
app.post('/api/customer/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Nombre, email y contraseña son requeridos." });
        }

        const existingCustomer = await prisma.customer.findUnique({ where: { email } });

        if (existingCustomer) {
            if (existingCustomer.password) {
                return res.status(400).json({ error: "Ya existe un usuario con este correo electrónico." });
            } else {
                const hashedPassword = await bcrypt.hash(password, 10);
                const updatedCustomer = await prisma.customer.update({
                    where: { email },
                    data: { name, password: hashedPassword }
                });

                const token = jwt.sign(
                    { id: updatedCustomer.id, email: updatedCustomer.email, role: 'customer' },
                    AUTH_SECRET,
                    { expiresIn: '30d' }
                );

                return res.status(200).json({ token, user: { name: updatedCustomer.name, email: updatedCustomer.email } });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newCustomer = await prisma.customer.create({
            data: { name, email, password: hashedPassword }
        });

        const token = jwt.sign(
            { id: newCustomer.id, email: newCustomer.email, role: 'customer' },
            AUTH_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({ token, user: { name: newCustomer.name, email: newCustomer.email } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor durante el registro." });
    }
});

app.post('/api/customer/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const customer = await prisma.customer.findUnique({ where: { email } });

        if (!customer || !customer.password) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const validPassword = await bcrypt.compare(password, customer.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const token = jwt.sign(
            { id: customer.id, email: customer.email, role: 'customer' },
            AUTH_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                company: customer.company,
                phone: customer.phone,
                address: customer.address
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor durante el login" });
    }
});

app.get('/api/customer/profile', authenticateCustomer, async (req, res) => {
    try {
        const customerId = req.user.id;
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, name: true, email: true, company: true, phone: true, address: true, createdAt: true }
        });

        if (!customer) {
            return res.status(404).json({ error: "Cliente no encontrado" });
        }

        res.json(customer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener perfil del cliente" });
    }
});

app.put('/api/customer/profile', authenticateCustomer, async (req, res) => {
    try {
        const customerId = req.user.id;
        const { name, company, email, phone, address } = req.body;

        if (email) {
            const existing = await prisma.customer.findFirst({
                where: { email, id: { not: customerId } }
            });
            if (existing) {
                return res.status(400).json({ error: "El correo electrónico ya está en uso por otra cuenta." });
            }
        }

        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: { name, company, email, phone, address },
            select: { id: true, name: true, email: true, company: true, phone: true, address: true, createdAt: true }
        });

        res.json(updatedCustomer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar perfil del cliente" });
    }
});

// --- RUTAS DE COTIZACIONES PARA CLIENTES ---

app.get('/api/customer/quotes', authenticateCustomer, async (req, res) => {
    try {
        const email = req.user.email;
        const quotes = await prisma.quoteRequest.findMany({
            where: { email: email },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { items: true }
                }
            }
        });
        res.json(quotes.map(q => ({ ...q, maskId: formatQuoteId(q.id) })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener historial de cotizaciones" });
    }
});

app.get('/api/customer/quotes/:id', authenticateCustomer, async (req, res) => {
    try {
        const { id } = req.params;
        const customerEmail = req.user.email;
        console.log(`[DEBUG] Buscando cotización ${id} para cliente ${customerEmail}`);

        const quote = await prisma.quoteRequest.findUnique({
            where: { id: parseInt(id) },
            include: { items: true }
        });

        if (!quote) {
            console.log(`[DEBUG] Cotización ${id} no encontrada en la DB`);
            return res.status(404).json({ error: "Cotización no encontrada" });
        }

        if (quote.email !== customerEmail) {
            console.log(`[DEBUG] Acceso denegado: Cotización ${id} pertenece a ${quote.email}, no a ${customerEmail}`);
            return res.status(403).json({ error: "No tienes permiso para ver esta cotización" });
        }

        res.json({ ...quote, maskId: formatQuoteId(quote.id) });
    } catch (error) {
        console.error('[SERVER ERROR]', error);
        res.status(500).json({ error: "Error al obtener detalles de la cotización" });
    }
});

// --- RUTAS DE ADMINISTRACIÓN (PROTEGIDAS) ---

app.get('/api/admin/cotizaciones', authenticateAdmin, async (req, res) => {
    try {
        const cotizaciones = await prisma.quoteRequest.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                items: true,
                _count: {
                    select: { items: true }
                }
            }
        });

        // Enriquecer ítems con el stock actual de la variante (por SKU)
        const enrichedCotizaciones = await Promise.all(cotizaciones.map(async (quote) => {
            const enrichedItems = await Promise.all(quote.items.map(async (item) => {
                const cleanSku = item.sku ? item.sku.trim() : "";
                const variant = await prisma.productVariant.findUnique({
                    where: { sku: cleanSku },
                    select: { stock: true }
                });
                return {
                    ...item,
                    currentStock: variant ? variant.stock : 0
                };
            }));
            return {
                ...quote,
                items: enrichedItems
            };
        }));

        res.json(enrichedCotizaciones.map(q => ({ ...q, maskId: formatQuoteId(q.id) })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener cotizaciones enriquecidas" });
    }
});

app.get('/api/admin/cotizaciones/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const cotizacion = await prisma.quoteRequest.findUnique({
            where: { id: parseInt(id) },
            include: { items: true }
        });

        if (!cotizacion) {
            return res.status(404).json({ error: "Cotización no encontrada" });
        }

        // Enriquecer ítems con el stock actual
        const enrichedItems = await Promise.all(cotizacion.items.map(async (item) => {
            const cleanSku = item.sku ? item.sku.trim() : "";
            const variant = await prisma.productVariant.findUnique({
                where: { sku: cleanSku },
                select: { stock: true }
            });
            return {
                ...item,
                currentStock: variant ? variant.stock : 0
            };
        }));

        res.json({ ...cotizacion, items: enrichedItems, maskId: formatQuoteId(cotizacion.id) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener la cotización" });
    }
});

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

// --- RUTAS DE PRODUCTOS ---

app.get('/api/productos', async (req, res) => {
    try {
        const productos = await prisma.product.findMany({
            orderBy: [
                { category: { displayOrder: 'asc' } },
                { displayOrder: 'asc' },
                { name: 'asc' }
            ],
            include: {
                images: { orderBy: { order: 'asc' } },
                category: true,
                variants: {
                    include: {
                        dimensions: { orderBy: { displayOrder: 'asc' } }
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

app.get('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const producto = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
                images: { orderBy: { order: 'asc' } },
                category: true,
                variants: {
                    include: {
                        dimensions: { orderBy: { displayOrder: 'asc' } }
                    }
                }
            }
        });

        if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
        res.json(producto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el producto" });
    }
});

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
                        sku: (item.variants?.[0]?.sku || 'N/A').trim(),
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            },
            include: { items: true }
        });

        if (email) {
            try {
                await prisma.customer.upsert({
                    where: { email },
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
            }
        }

        io.emit('new-quote', cotizacion);
        res.status(201).json(cotizacion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear la cotización" });
    }
});

app.post('/api/productos/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress || '0.0.0.0';

        const existingView = await prisma.productView.findUnique({
            where: { ip_productId: { ip, productId } }
        });

        if (!existingView) {
            await prisma.productView.create({ data: { ip, productId } });
            await prisma.product.update({
                where: { id: productId },
                data: { viewCount: { increment: 1 } }
            });
        }

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

// --- INICIAR SERVIDOR ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor HTTP y WebSocket corriendo en http://localhost:${PORT}`);
});