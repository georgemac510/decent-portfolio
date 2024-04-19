# Use Node.js v20.x image as the base image
FROM node:20

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose port 3000 for the Express app
EXPOSE 3000

# Command to run the Express app
CMD ["node", "index1.js"]
