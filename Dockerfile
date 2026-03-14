# Usamos una imagen completa de Node.js para evitar errores gyp
FROM node:20

# Creamos el directorio de trabajo
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Copiamos la carpeta prisma para que el postinstall funcione
COPY prisma ./prisma/

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto que usa Express
EXPOSE 3000

# Comando para desarrollo
CMD ["npm", "run", "dev"]