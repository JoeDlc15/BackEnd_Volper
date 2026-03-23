require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const https = require('https');

const AUTH_SECRET = process.env.AUTH_SECRET || 'volper_secret_2024_key';

const formatQuoteId = (id) => `COT-${String(id).padStart(5, '0')}`;
console.log('--- BACKEND CONFIGURATION ---');
console.log('DB:', process.env.DATABASE_URL ? 'OK' : 'MISSING');
console.log('N8N WEBHOOK:', process.env.N8N_WHATSAPP_WEBHOOK_URL || 'NOT CONFIGURED');
console.log('----------------------------');
const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

// Configuración de Multer para gestión de archivos temporales
const upload = multer({ dest: 'uploads/' });

// Ruta de prueba inmediata
app.get('/api/test-debug', (req, res) => res.json({ status: 'ok', message: 'Backend actualizado' }));

// Configuración de WebSockets (Socket.io)
const http = require('http');
const { Server } = require('socket.io');

// Configuración de Email Transporter
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: process.env.MAIL_PORT || 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

const sendEmail = async (options) => {
    try {
        if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
            console.warn('⚠️ Credenciales de correo no configuradas. Simulando envío...');
            console.log('--- EMAIL SIMULADO ---');
            console.log('Para:', options.to);
            console.log('Asunto:', options.subject);
            console.log('Mensaje:', options.text);
            console.log('-----------------------');
            return true;
        }
        await transporter.sendMail({
            from: process.env.MAIL_FROM || '"Soporte" <no-reply@example.com>',
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });
        return true;
    } catch (error) {
        console.error('Error enviando email:', error);
        return false;
    }
};

const notifyN8n = async (quote) => {
    const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn('⚠️ Webhook de n8n no configurado. Ignorando notificación...');
        return;
    }

    try {
        const url = new URL(webhookUrl);
        const data = JSON.stringify({
            id: formatQuoteId(quote.id),
            rawId: quote.id,
            company: quote.company || 'N/A',
            contact: quote.contact,
            phone: quote.phone || 'N/A',
            email: quote.email,
            items: quote.items.map(item => ({
                sku: item.sku,
                name: item.productName,
                quantity: item.quantity
            })),
            timestamp: new Date().toISOString()
        });

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            console.log(`[n8n] ✅ Notificación enviada. Status: ${res.statusCode}`);
            res.on('data', (d) => {
                console.log(`[n8n] Respuesta body: ${d}`);
            });
        });

        req.on('error', (error) => {
            console.error('[n8n] ❌ Error en la petición al webhook:', error.message);
        });

        req.write(data);
        req.end();
    } catch (error) {
        console.error('[n8n] Error crítico notificando a n8n:', error);
    }
};

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

app.post('/api/customer/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const customer = await prisma.customer.findUnique({ where: { email } });

        if (!customer) {
            return res.status(404).json({ error: "No existe una cuenta con este correo electrónico." });
        }

        // Generar token único (64 hex chars)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hora desde ahora

        await prisma.customer.update({
            where: { email },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpires: resetPasswordExpires
            }
        });

        // Crear enlace (ajustado a la URL del frontend)
        const resetLink = `${process.env.FRONTEND_CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        const emailOptions = {
            to: customer.email,
            subject: 'Recuperación de Contraseña - Volper Seal',
            text: `Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar: ${resetLink}. El enlace expira en 1 hora.`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333;">Recuperación de Contraseña</h2>
                    <p>Hola <strong>${customer.name}</strong>,</p>
                    <p>Has solicitado restablecer tu contraseña para tu cuenta en Volper Seal.</p>
                    <p>Haz clic en el botón de abajo para elegir una nueva contraseña:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer Contraseña</a>
                    </div>
                    <p style="font-size: 12px; color: #777;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 10px; color: #999;">Este enlace expira en 1 hora.</p>
                </div>
            `
        };

        const emailSent = await sendEmail(emailOptions);
        if (!emailSent) {
            return res.status(500).json({ error: "No se pudo enviar el correo de recuperación." });
        }

        res.json({ message: "Se ha enviado un correo con instrucciones para restablecer tu contraseña." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error procesando la solicitud de recuperación." });
    }
});

app.post('/api/customer/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        const customer = await prisma.customer.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() } // Debe ser mayor a la hora actual
            }
        });

        if (!customer) {
            return res.status(400).json({ error: "El token de recuperación es inválido o ha expirado." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.customer.update({
            where: { id: customer.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });

        res.json({ message: "Tu contraseña ha sido actualizada con éxito. Ya puedes iniciar sesión." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al restablecer la contraseña." });
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

// --- FAVORITOS PARA CLIENTES ---
app.get('/api/favorites', authenticateCustomer, async (req, res) => {
    try {
        const favorites = await prisma.favorite.findMany({
            where: { customerId: req.user.id },
            select: { productId: true }
        });
        res.json(favorites.map(f => f.productId));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener favoritos" });
    }
});

app.post('/api/favorites/toggle', authenticateCustomer, async (req, res) => {
    try {
        const { productId } = req.body;
        if (!productId) return res.status(400).json({ error: "ID de producto requerido" });

        const existing = await prisma.favorite.findUnique({
            where: {
                customerId_productId: {
                    customerId: req.user.id,
                    productId: parseInt(productId)
                }
            }
        });

        if (existing) {
            await prisma.favorite.delete({ where: { id: existing.id } });
            res.json({ action: 'removed', productId });
        } else {
            await prisma.favorite.create({
                data: {
                    customerId: req.user.id,
                    productId: parseInt(productId)
                }
            });
            res.json({ action: 'added', productId });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al alternar favorito" });
    }
});

app.post('/api/favorites/sync', authenticateCustomer, async (req, res) => {
    try {
        const { productIds } = req.body; // Array de IDs de localStorage
        if (!Array.isArray(productIds)) return res.status(400).json({ error: "productIds debe ser un array" });

        // Sincronizar (añadir los que no existan)
        if (productIds.length > 0) {
            const operations = productIds.map(id =>
                prisma.favorite.upsert({
                    where: {
                        customerId_productId: {
                            customerId: req.user.id,
                            productId: parseInt(id)
                        }
                    },
                    update: {},
                    create: {
                        customerId: req.user.id,
                        productId: parseInt(id)
                    }
                })
            );
            await Promise.all(operations);
        }

        const allFavs = await prisma.favorite.findMany({
            where: { customerId: req.user.id },
            select: { productId: true }
        });
        res.json(allFavs.map(f => f.productId));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al sincronizar favoritos" });
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

// Editar ítems de una cotización (solo si está pendiente)
app.put('/api/customer/quotes/:id/items', authenticateCustomer, async (req, res) => {
    try {
        const { id } = req.params;
        const { items } = req.body;
        const customerEmail = req.user.email;

        const quote = await prisma.quoteRequest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!quote) return res.status(404).json({ error: "Cotización no encontrada" });
        if (quote.email !== customerEmail) return res.status(403).json({ error: "No tienes permiso para editar esta cotización" });
        if (quote.status !== 'pending') return res.status(400).json({ error: "Solo se pueden editar cotizaciones en estado pendiente" });

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "La cotización debe tener al menos un producto" });
        }

        // Estrategia: borrar items existentes y recrear con los nuevos datos
        const updatedQuote = await prisma.$transaction(async (tx) => {
            await tx.quoteItem.deleteMany({ where: { quoteRequestId: parseInt(id) } });

            await tx.quoteItem.createMany({
                data: items.map(item => ({
                    productName: item.productName,
                    sku: item.sku,
                    quantity: parseInt(item.quantity),
                    price: 0,
                    quoteRequestId: parseInt(id)
                }))
            });

            return tx.quoteRequest.findUnique({
                where: { id: parseInt(id) },
                include: { items: true }
            });
        });

        res.json({ ...updatedQuote, maskId: formatQuoteId(updatedQuote.id) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar los ítems de la cotización" });
    }
});

// Cancelar una cotización (solo si está pendiente)
app.put('/api/customer/quotes/:id/cancel', authenticateCustomer, async (req, res) => {
    try {
        const { id } = req.params;
        const customerEmail = req.user.email;

        const quote = await prisma.quoteRequest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!quote) return res.status(404).json({ error: "Cotización no encontrada" });
        if (quote.email !== customerEmail) return res.status(403).json({ error: "No tienes permiso para cancelar esta cotización" });
        if (quote.status !== 'pending') return res.status(400).json({ error: "Solo se pueden cancelar cotizaciones en estado pendiente" });

        const updatedQuote = await prisma.quoteRequest.update({
            where: { id: parseInt(id) },
            data: { status: 'cancelled' },
            include: { items: true }
        });

        res.json({ ...updatedQuote, maskId: formatQuoteId(updatedQuote.id) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al cancelar la cotización" });
    }
});

// Duplicar/Re-cotizar (crea una nueva cotización basada en una existente)
app.post('/api/customer/quotes/:id/duplicate', authenticateCustomer, async (req, res) => {
    try {
        const { id } = req.params;
        const customerEmail = req.user.email;

        const originalQuote = await prisma.quoteRequest.findUnique({
            where: { id: parseInt(id) },
            include: { items: true }
        });

        if (!originalQuote) return res.status(404).json({ error: "Cotización original no encontrada" });
        if (originalQuote.email !== customerEmail) return res.status(403).json({ error: "No tienes permiso para duplicar esta cotización" });

        const newQuote = await prisma.quoteRequest.create({
            data: {
                customerId: originalQuote.customerId,
                company: originalQuote.company,
                contact: originalQuote.contact,
                phone: originalQuote.phone,
                email: originalQuote.email,
                status: 'pending',
                items: {
                    create: originalQuote.items.map(item => ({
                        productName: item.productName,
                        sku: item.sku,
                        quantity: item.quantity,
                        price: 0
                    }))
                }
            },
            include: { items: true }
        });

        // Notificar por WhatsApp la nueva re-cotización
        notifyN8n(newQuote);
        io.emit('new-quote', newQuote);

        res.status(201).json({ ...newQuote, maskId: formatQuoteId(newQuote.id) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al duplicar la cotización" });
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

// Cambiar estado de una cotización (Admin)
app.put('/api/admin/cotizaciones/:id/status', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNote } = req.body;

        const validStatuses = ['pending', 'in_review', 'approved', 'rejected', 'cancelled', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Estado inválido. Válidos: ${validStatuses.join(', ')}` });
        }

        const quote = await prisma.quoteRequest.findUnique({
            where: { id: parseInt(id) },
            include: { items: true }
        });

        if (!quote) return res.status(404).json({ error: "Cotización no encontrada" });

        const updatedQuote = await prisma.quoteRequest.update({
            where: { id: parseInt(id) },
            data: { status },
            include: { items: true }
        });

        const maskId = formatQuoteId(updatedQuote.id);
        const statusLabels = {
            pending: 'Pendiente',
            in_review: 'En Revisión',
            approved: 'Aprobada',
            rejected: 'Rechazada',
            cancelled: 'Cancelada',
            closed: 'Cerrada'
        };

        // Notificación WebSocket al cliente en tiempo real
        io.emit('quote-status-updated', {
            quoteId: updatedQuote.id,
            maskId,
            status: updatedQuote.status,
            statusLabel: statusLabels[status] || status,
            adminNote: adminNote || '',
            email: updatedQuote.email,
            timestamp: new Date().toISOString()
        });

        console.log(`[ADMIN] Cotización ${maskId} → "${status}" ${adminNote ? `| Nota: ${adminNote}` : ''}`);
        res.json({ ...updatedQuote, maskId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar el estado de la cotización" });
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

        const currentVariant = await prisma.productVariant.findUnique({
            where: { sku }
        });

        if (!currentVariant) return res.status(404).json({ error: "Variante no encontrada" });

        const dataToUpdate = {};
        if (price !== undefined) dataToUpdate.price = parseFloat(price);

        let movement = null;
        if (stock !== undefined) {
            const newStock = parseInt(stock);
            const diff = newStock - currentVariant.stock;

            if (diff !== 0) {
                dataToUpdate.stock = newStock;
                // Generar movimiento de ajuste automático
                movement = {
                    movementType: 'ajuste',
                    quantity: Math.abs(diff),
                    previousStock: currentVariant.stock,
                    resultingStock: newStock,
                    reason: diff > 0 ? "Ajuste manual (Incremento)" : "Ajuste manual (Decremento)",
                    reference: "ADJ-MANUAL",
                    productId: currentVariant.productId,
                    variantId: currentVariant.id
                };
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.productVariant.update({
                where: { sku },
                data: dataToUpdate
            });

            if (movement) {
                await tx.inventoryMovement.create({ data: movement });
            }
            return updated;
        });

        res.json(result);
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

// --- GESTIÓN DE CATEGORÍAS ---

app.get('/api/admin/categories', authenticateAdmin, async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { displayOrder: 'asc' },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener categorías" });
    }
});

app.post('/api/admin/categories', authenticateAdmin, async (req, res) => {
    try {
        const { name, description, displayOrder } = req.body;
        const slug = name.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const category = await prisma.category.create({
            data: {
                name,
                slug,
                description,
                displayOrder: displayOrder ? parseInt(displayOrder) : undefined
            }
        });
        res.status(201).json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear categoría" });
    }
});

app.put('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, displayOrder } = req.body;

        const data = {
            name,
            description,
            displayOrder: displayOrder ? parseInt(displayOrder) : undefined
        };

        if (name) {
            data.slug = name.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }

        const category = await prisma.category.update({
            where: { id: parseInt(id) },
            data
        });
        res.json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar categoría" });
    }
});

app.delete('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const categoryId = parseInt(id);

        const productsCount = await prisma.product.count({
            where: { categoryId }
        });

        if (productsCount > 0) {
            return res.status(400).json({
                error: "No se puede eliminar la categoría porque tiene productos asociados. Debe mover o eliminar los productos primero."
            });
        }

        await prisma.category.delete({
            where: { id: categoryId }
        });

        res.json({ success: true, message: "Categoría eliminada correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar categoría" });
    }
});

// --- GESTIÓN DE PRODUCTOS ---

app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
    try {
        const { name, description, categoryId, displayOrder, initialVariant } = req.body;

        const product = await prisma.product.create({
            data: {
                name,
                description,
                categoryId: parseInt(categoryId),
                displayOrder: displayOrder ? parseInt(displayOrder) : undefined,
                variants: initialVariant ? {
                    create: {
                        sku: initialVariant.sku,
                        name: initialVariant.name || name,
                        price: parseFloat(initialVariant.price),
                        stock: parseInt(initialVariant.stock),
                        unit: initialVariant.unit || 'pza'
                    }
                } : undefined
            },
            include: { variants: true }
        });

        // Registrar movimiento inicial de stock si hay variante
        if (initialVariant && initialVariant.stock > 0) {
            await prisma.inventoryMovement.create({
                data: {
                    movementType: 'ENTRADA',
                    quantity: parseInt(initialVariant.stock),
                    previousStock: 0,
                    resultingStock: parseInt(initialVariant.stock),
                    reason: 'Carga inicial de producto nuevo',
                    productId: product.id,
                    variantId: product.variants[0].id
                }
            });
        }

        res.status(201).json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear producto. Verifique que el nombre no esté duplicado." });
    }
});

app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, categoryId, displayOrder } = req.body;

        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                categoryId: categoryId ? parseInt(categoryId) : undefined,
                displayOrder: displayOrder ? parseInt(displayOrder) : undefined
            }
        });
        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar producto" });
    }
});

app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);

        // Gracias a onDelete: Cascade en schema.prisma, el borrado de 
        // movimientos, vistas, imágenes y variantes se hace automáticamente.
        await prisma.product.delete({ where: { id: productId } });

        res.json({ success: true, message: "Producto eliminado correctamente" });

        res.json({ success: true, message: "Producto eliminado correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar producto" });
    }
});

// --- GESTIÓN DE VARIANTES ---

app.post('/api/admin/products/:id/variants', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { sku, name, price, stock, unit, minStock, barcode } = req.body;

        const variant = await prisma.productVariant.create({
            data: {
                sku,
                name,
                price: parseFloat(price),
                stock: parseInt(stock),
                unit,
                minStock: minStock ? parseInt(minStock) : undefined,
                barcode,
                productId: parseInt(id)
            }
        });

        // Registrar movimiento inicial de stock
        if (stock > 0) {
            await prisma.inventoryMovement.create({
                data: {
                    movementType: 'ENTRADA',
                    quantity: parseInt(stock),
                    previousStock: 0,
                    resultingStock: parseInt(stock),
                    reason: 'Carga inicial de variante',
                    productId: parseInt(id),
                    variantId: variant.id
                }
            });
        }

        res.status(201).json(variant);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear variante. Verifique que el SKU no esté duplicado." });
    }
});

app.delete('/api/admin/variants/:sku', authenticateAdmin, async (req, res) => {
    try {
        const { sku } = req.params;
        const variant = await prisma.productVariant.findUnique({
            where: { sku }
        });

        if (!variant) return res.status(404).json({ error: "Variante no encontrada" });

        // Gracias a onDelete: Cascade en schema.prisma, el borrado de 
        // dimensiones y movimientos se hace automáticamente.
        await prisma.productVariant.delete({ where: { sku } });

        res.json({ success: true, message: "Variante eliminada correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar variante" });
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
        const absQuantity = Math.abs(parseInt(quantity));
        let newStock = prevStock;
        let finalQuantityToStore = absQuantity;

        // Lógica de Stock: El tipo decide si suma o resta
        if (['entrada', 'devolucion', 'ajuste_positivo'].includes(movementType)) {
            newStock += absQuantity;
            finalQuantityToStore = absQuantity;
        } else if (['salida', 'merma', 'ajuste_negativo'].includes(movementType)) {
            newStock -= absQuantity;
            finalQuantityToStore = -absQuantity; // Se guarda negativo para el historial
        } else if (movementType === 'ajuste') {
            const rawQty = parseInt(quantity);
            newStock += rawQty;
            finalQuantityToStore = rawQty;
        }

        const [updatedVariant, movement] = await prisma.$transaction([
            prisma.productVariant.update({
                where: { id: parseInt(variantId) },
                data: { stock: newStock }
            }),
            prisma.inventoryMovement.create({
                data: {
                    movementType,
                    quantity: finalQuantityToStore,
                    previousStock: prevStock,
                    resultingStock: newStock,
                    reason,
                    reference,
                    supplier,
                    unitCost: unitCost ? parseFloat(unitCost) : null,
                    totalCost: unitCost ? parseFloat(unitCost) * absQuantity : null,
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

        if (!producto) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        res.json(producto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el producto" });
    }
});

// --- IMPORTACIÓN MASIVA ---
app.post('/api/admin/products/import', authenticateAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    const filePath = req.file.path;
    const stats = { created: 0, updated: 0, skipped: 0, errors: [] };

    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        for (const [index, row] of data.entries()) {
            const nombre = row.nombre ? String(row.nombre).trim() : null;
            const sku = row.sku ? String(row.sku).trim() : null;

            if (!nombre || !sku) {
                stats.skipped++;
                continue;
            }

            try {
                // 1. Buscamos o creamos el producto base
                let product = await prisma.product.findFirst({
                    where: { name: nombre }
                });

                if (!product) {
                    product = await prisma.product.create({
                        data: {
                            name: nombre,
                            description: row.descripcion || '',
                            categoryId: parseInt(row.cat_id) || 1,
                            images: {
                                create: row.img_urls ? row.img_urls.split(',').map((url, i) => ({
                                    url: url.trim(), isPrimary: i === 0, order: i
                                })) : []
                            }
                        }
                    });
                    stats.created++;
                } else {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            description: row.descripcion || product.description,
                            categoryId: parseInt(row.cat_id) || product.categoryId
                        }
                    });
                }

                // 2. Manejamos la VARIANTE (SKU)
                const variantData = {
                    name: row.nombreVariant ? String(row.nombreVariant).trim() : null,
                    price: parseFloat(row.precio_var) || 0,
                    stock: parseInt(row.stock) || 0,
                    barcode: row.barcode ? String(row.barcode).trim() : '',
                    material: row.material || 'Bronce',
                    measureType: row.measureType || 'Pulgada',
                    productId: product.id
                };

                const existingVariant = await prisma.productVariant.findUnique({
                    where: { sku: sku }
                });

                if (!existingVariant) {
                    await prisma.$transaction(async (tx) => {
                        const newVariant = await tx.productVariant.create({
                            data: {
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

                        await tx.inventoryMovement.create({
                            data: {
                                movementType: 'entrada',
                                quantity: variantData.stock,
                                previousStock: 0,
                                resultingStock: variantData.stock,
                                reason: 'Carga inicial por importación (Dashboard)',
                                reference: 'IMPORT-DASH',
                                productId: product.id,
                                variantId: newVariant.id
                            }
                        });
                    });
                } else {
                    const stockDiff = variantData.stock - existingVariant.stock;
                    await prisma.$transaction(async (tx) => {
                        await tx.productVariant.update({
                            where: { sku: sku },
                            data: {
                                name: variantData.name,
                                price: variantData.price,
                                stock: variantData.stock,
                                barcode: variantData.barcode
                            }
                        });

                        if (stockDiff !== 0) {
                            await tx.inventoryMovement.create({
                                data: {
                                    movementType: 'ajuste',
                                    quantity: Math.abs(stockDiff),
                                    previousStock: existingVariant.stock,
                                    resultingStock: variantData.stock,
                                    reason: 'Actualización por importación (Dashboard)',
                                    reference: 'IMPORT-DASH',
                                    productId: product.id,
                                    variantId: existingVariant.id
                                }
                            });
                        }
                    });
                    stats.updated++;
                }
            } catch (rowError) {
                stats.errors.push(`Fila ${index + 2}: ${rowError.message}`);
                console.error(`Error en fila ${index + 2}:`, rowError);
            }
        }

        res.json({ success: true, stats });

    } catch (error) {
        console.error('Error crítico en importación:', error);
        res.status(500).json({ error: 'Error del servidor al procesar el archivo' });
    } finally {
        // Limpiar archivo temporal
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});

app.post('/api/cotizaciones', async (req, res) => {
    try {
        const { company, contact, phone, email, items, customerId } = req.body;

        // Intentar vincular con cliente existente por ID o Email
        let linkedCustomerId = customerId;
        if (!linkedCustomerId && email) {
            const customer = await prisma.customer.findUnique({ where: { email } });
            if (customer) linkedCustomerId = customer.id;
        }

        const cotizacion = await prisma.quoteRequest.create({
            data: {
                customerId: linkedCustomerId,
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

        // Sincronizar/Upsert datos del cliente
        if (email) {
            try {
                await prisma.customer.upsert({
                    where: { email },
                    update: {
                        name: contact,
                        company: company || undefined,
                        phone: phone || undefined,
                        notes: `Última cotización vinculada el ${new Date().toLocaleString()}`
                    },
                    create: {
                        name: contact,
                        company: company || null,
                        email: email,
                        phone: phone || null,
                        notes: `Cliente registrado automáticamente el ${new Date().toLocaleString()}`
                    }
                });
            } catch (customerError) {
                console.error('Error al sincronizar cliente:', customerError);
            }
        }

        io.emit('new-quote', cotizacion);

        // Notificar a n8n para envío de WhatsApp
        notifyN8n(cotizacion);

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