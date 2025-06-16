const express = require('express');
const app = express();
require('dotenv').config()
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const multer = require('multer');
// use middle wares
const nodemailer = require('nodemailer');

// app.use(cors());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());


const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "unauthorize access" })
    }
    // bearer token
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: "unauthorize access" })
        }
        req.decoded = decoded;
        next();
    })
}








// Databasee Connection 



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xhirfgb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
const upload = multer();
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // creat db an db collections

        const usersCollection = client.db("expressoDB").collection("users");
        const coffeesCollection = client.db("expressoDB").collection("coffees");
        const cartsCollection = client.db("expressoDB").collection("carts");
        const ordersCollection = client.db("expressoDB").collection("orders");


        //email
        app.post('/sendemail', async (req, res) => {
            const mail = req.body
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
            const body = `
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Template</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        margin: 0;
                        padding: 0;
                    }
            
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
            
                    .header {
                        text-align: center;
                        background-color: #e1fbfc;
                        padding: 10px;
                    }
            
                    .footer {
                        text-align: center;
                        background-color: #e1fbfc;
                        padding: 10px;
                    }
            
                    .body-content {
                        padding: 20px;
                        background-color: #ffffff;
                    }
            
                    .button {
                        display: inline-block;
                        padding: 10px 20px;
                        background-color: #007BFF;
                        color: white !important;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bolder !important;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Espresso Emporium</h1>
                    </div>
            
                    <div class="body-content">
                        <h2>Name: <strong>${mail.name}</strong></h2>
                        <p>Email: <strong>${mail.email}</strong></p>
                        <p>Message: ${mail.message}</p>
                    </div>
                </div>
            </body>
            </html>
            `;
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: 'engrmarufw@gmail.com',
                subject: 'Contact',
                html: body
            };
            await transporter.sendMail(mailOptions);
            res.send();

        })

        // post users
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ token })
        });


        app.post('/imguploadimgbb', upload.single('image'), async (req, res) => {
            const a = req.file

            try {
                const blob = new Blob([a.buffer], { type: a.mimetype });
                const formData = new FormData();
                formData.append('image', blob, a.originalname);
                const response = await fetch('https://api.imgbb.com/1/upload?key=2a55d4892836932d2e39cadb5508ce97', {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    const imgbbUrl = data.data.url;
                    res.send(JSON.stringify(imgbbUrl));
                } else {
                    console.error('Error uploading image to imgbb:', response.statusText);
                    res.send(response.status);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                res.send(error);
            }
        })

        //get users
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })
        // Get user by email
        app.get('/users/emailfind/:email', async (req, res) => {
            const userEmail = req.params.email;
            const result = await usersCollection.findOne({ email: userEmail });
            res.send(result);
        });




        // post users
        app.post('/users', async (req, res) => {
            try {
                const newUser = req.body;
                const query = { email: newUser.email }
                const existingUser = await usersCollection.findOne(query);
                if (existingUser) {
                    return res.send({ message: 'user already exists' })
                }
                const result = await usersCollection.insertOne(newUser);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });


        /// delete users
        app.delete('/users/:id', async (req, res) => {
            const userID = req.params.id;
            try {
                const result = await usersCollection.deleteOne({ _id: new ObjectId(userID) });
                if (result.deletedCount === 1) {
                    res.send(`Successfully deleted coffee with ID ${userID}`);
                } else {
                    res.status(404).send(`Coffee with ID ${userID} not found`);
                }
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });


        // app.patch('/users/admin/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = {_id: new ObjectId(id) };
        //     const updateDoc = {
        //         $set: {
        //             role: 'admin'
        //         }
        //     }

        // });



        // users update 
        app.put('/users/:id', async (req, res) => {
            const userId = req.params.id;
            const updatedUsersData = req.body;
            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(userId) },
                    { $set: updatedUsersData }
                );

                if (result.matchedCount === 1) {
                    res.send(`Successfully updated coffee with ID ${userId}`);
                } else {
                    res.status(404).send(`Coffee with ID ${userId} not found`);
                }
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });


        // Update user by email
        app.put('/users/email/:email', async (req, res) => {
            const userEmail = req.params.email;
            const updatedUserData = req.body;

            try {
                const result = await usersCollection.updateOne(
                    { email: userEmail },
                    { $set: updatedUserData }
                );

                if (result.matchedCount === 1) {
                    res.send(`Successfully updated user with email ${userEmail}`);
                } else {
                    res.status(404).send(`User with email ${userEmail} not found`);
                }
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });








        //get coffee
        app.get('/coffees', async (req, res) => {
            const result = await coffeesCollection.find().toArray();
            res.send(result);
        })

        //get coffee by id
        app.get('/coffees/:id', async (req, res) => {
            const coffeeId = req.params.id;
            const result = await coffeesCollection.findOne({ _id: new ObjectId(coffeeId) });
            res.send(result);
        });

        // post
        app.post('/coffees', async (req, res) => {
            try {
                const newCoffee = req.body; // Assuming the request body contains the new coffee data
                const result = await coffeesCollection.insertOne(newCoffee);
                res.send(result); // Send back the inserted coffee
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });


        //delete coffee
        app.delete('/coffees/:id', async (req, res) => {
            const coffeeId = req.params.id;
            try {
                const result = await coffeesCollection.deleteOne({ _id: new ObjectId(coffeeId) });
                if (result.deletedCount === 1) {
                    res.send(`Successfully deleted coffee with ID ${coffeeId}`);
                } else {
                    res.status(404).send(`Coffee with ID ${coffeeId} not found`);
                }
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });
        // ...
        app.put('/coffees/:id', async (req, res) => {
            const coffeeId = req.params.id;
            const updatedCoffeeData = req.body;
            try {
                const result = await coffeesCollection.updateOne(
                    { _id: new ObjectId(coffeeId) },
                    { $set: updatedCoffeeData }
                );

                if (result.matchedCount === 1) {
                    res.send(`Successfully updated coffee with ID ${coffeeId}`);
                } else {
                    res.status(404).send(`Coffee with ID ${coffeeId} not found`);
                }
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });
        // ...





        // carts start

        //get users
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            const query = { email: email }
            const result = await cartsCollection.find(query).toArray();
            res.send(result);
        })

        // app.get('/carts', async (req, res) => {
        //     const email = req.query.email;
        //     if(!email){
        //         res.send([]);
        //     }
        //     const query = {email: email}
        //     const result = await cartsCollection.find(query).toArray();
        //     res.send(result);
        // })

        //get coffee by id
        app.get('/carts/:id', async (req, res) => {
            const cartsId = req.params.id;
            const result = await cartsCollection.findOne({ _id: new ObjectId(cartsId) });
            res.send(result);
        });

        // post
        app.post('/carts', async (req, res) => {
            try {
                const cartCoffee = req.body; // Assuming the request body contains the new coffee data
                console.log(cartCoffee);
                const result = await cartsCollection.insertOne(cartCoffee);
                res.send(result); // Send back the inserted coffee
                console.log(result);
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });


        //delete cart
        app.delete('/carts/:id', async (req, res) => {
            const cartId = req.params.id;
            try {
                const result = await cartsCollection.deleteOne({ _id: new ObjectId(cartId) });
                if (result.deletedCount === 1) {
                    res.send(`Successfully deleted coffee with ID ${cartId}`);
                } else {
                    res.status(404).send(`Coffee with ID ${cartId} not found`);
                }
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });

        app.put('/carts/:id', async (req, res) => {
            const cartId = req.params.id;
            const updatecartData = req.body;
            try {
                const result = await cartsCollection.updateOne(
                    { _id: new ObjectId(cartId) },
                    { $set: updatecartData }
                );

                if (result.matchedCount === 1) {
                    res.send(`Successfully updated coffee with ID ${cartId}`);
                } else {
                    res.status(404).send(`Coffee with ID ${cartId} not found`);
                }
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });
        // ...












        // carts end 



        /// start order


        // app.get('/orders', async (req, res) => {
        //     const result = await ordersCollection.find().toArray();
        //     res.send(result);
        // })

        app.get('/orders/all', async (req, res) => {
            const result = await ordersCollection.find().toArray();
            res.send(result);
        })
        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }
            const query = { email: email }
            const result = await ordersCollection.find(query).toArray();
            res.send(result);
        })
        //get coffee by id
        app.get('/orders/:id', async (req, res) => {
            const orderId = req.params.id;
            const result = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
            res.send(result);
        });

        // post
        app.post('/orders', async (req, res) => {
            try {
                const newOrder = req.body; // Assuming the request body contains the new coffee data
                const result = await ordersCollection.insertOne(newOrder);
                res.send(result); // Send back the inserted coffee
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });


        //delete coffee
        app.delete('/orders/:id', async (req, res) => {
            const orderId = req.params.id;
            try {
                const result = await ordersCollection.deleteOne({ _id: new ObjectId(orderId) });
                if (result.deletedCount === 1) {
                    res.send(`Successfully deleted coffee with ID ${orderId}`);
                } else {
                    res.status(404).send(`Coffee with ID ${orderId} not found`);
                }
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });
        // ...
        app.put('/orders/:id', async (req, res) => {
            const orderId = req.params.id;
            const updatedCoffeeData = req.body;
            try {
                const result = await ordersCollection.updateOne(
                    { _id: new ObjectId(orderId) },
                    { $set: updatedCoffeeData }
                );

                if (result.matchedCount === 1) {
                    res.send(`Successfully updated coffee with ID ${orderId}`);
                } else {
                    res.status(404).send(`Coffee with ID ${orderId} not found`);
                }
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });
        // ...


        ///end order





















        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.closse();
    }
}
run().catch(console.dir);












app.get('/', (req, res) => {
    res.send("Welcome to Espresso API Zone");
})

app.listen((port), () => {
    console.log(`Listening on port ${port}`);
})
