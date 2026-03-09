# Usamos una imagen ligera de Node.js
FROM node:20-alpine

# Creamos el directorio de trabajo
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Generamos el cliente de Prisma dentro del contenedor
RUN npx prisma generate

# Exponemos el puerto que usa Express
EXPOSE 3000

# Comando para desarrollo
CMD ["npm", "run", "dev"]