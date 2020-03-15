const dialogflow = require('dialogflow');
const admin = require('firebase-admin');
// const functions = require('firebase-functions');
const uuid = require('uuid');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sessionId = uuid.v4();
// const { WebhookClient } = require('dialogflow-fulfillment');
const serviceAccount = require('./serviceAccount.json');

const app = express();
let count = ''
let type = '';
let size = '';
let Name = '';
let Email = '';
let Address = '';
let Phone = '';
let trackOrder = '';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.post('/order', (req, res) => {
    let text = req.body.queryInput;
    runSample(text)
        .then(data => {
            console.log(data);
            res.send(data);
        })
        .catch(err => {
            console.log('Something went wrong');
            process.exit();
        })
});

/**
 * Send a query to the dialogflow agent, and return the query result.
 * @param {string} projectId The project to be used
 */
async function runSample(text, projectId = 'yo-yo-pizza-gdkyia') {
    // Create a new session
    const sessionClient = new dialogflow.SessionsClient({
        // keyFilename: "F:/Yellow Messenger/yoyopizza/Yo-Yo-Pizza-bbfc9a0474d7.json"
        keyFilename: './Yo-Yo-Pizza-bbfc9a0474d7.json'
    });
    const sessionPath = sessionClient.sessionPath(projectId, sessionId);

    // The text query request.
    const request = {
        session: sessionPath,
        queryInput: text
    };
    // Send request and log result
    const responses = await sessionClient.detectIntent(request);
    // console.log('Detected intent');
    const result = responses[0].queryResult;
    // console.log(`  Query: ${result.queryText}`);
    // console.log(`  Response: ${result.fulfillmentText}`);
    // console.log(result.parameters);
    // console.log(result.parameters.fields.Type.stringValue);
    // if (result.intent) {
    //     console.log(`  Intent: ${result.intent.displayName}`);
    // } else {
    //     console.log(`  No intent matched.`);
    // }
    const db = admin.firestore();

    if (result.intent.displayName === 'Order-Pizza') {
        if (result.parameters.fields.Type.stringValue) {
            type = result.parameters.fields.Type.stringValue;
            if (type === 'Non-veg') {
                type = type[0] + type[4].toUpperCase();
            }
            else {
                type = type[0];
            }
        }

        if (result.parameters.fields.Size.stringValue) {
            size = result.parameters.fields.Size.stringValue;
            size = size[0];
        }

        if (result.parameters.fields.Count.stringValue) {
            count = result.parameters.fields.Count.stringValue;
        }

        if (result.parameters.fields.Name.stringValue) {
            Name = result.parameters.fields.Name.stringValue;
        }
        if (result.parameters.fields.Email.stringValue) {
            Email = result.parameters.fields.Email.stringValue;
        }
        if (result.parameters.fields.Address.stringValue) {
            Address = result.parameters.fields.Address.stringValue;
        }
        if (result.parameters.fields.Phone.stringValue) {
            Phone = result.parameters.fields.Phone.stringValue;
        }

        if (Name && Email && Address && Phone) {
            const orderID = count + type + size + (Math.floor(Math.random() * (1000 - 1) + 1));
            const details = db.collection('Users').doc(Email);
            details.set({
                Name: Name,
                Email: Email,
                Address: Address,
                Phone: Phone,
                orderID: admin.firestore.FieldValue.arrayUnion(orderID)
                // Date: date
            }, { merge: true });

            count = '';
            type = '';
            size = '';
            Name = '';
            Email = '';
            Address = '';
            Phone = '';
            result.fulfillmentText = `Your order id is ${orderID}.\n` + result.fulfillmentText;
        }
        
    }else if (result.intent.displayName === 'trackOrder'){
        if(result.parameters.fields.orderID.stringValue){
            trackOrder = result.parameters.fields.orderID.stringValue;
        }
        if(result.parameters.fields.email.stringValue){
            Email = result.parameters.fields.email.stringValue;
        }

        if(trackOrder && Email){
            const details = db.collection('Users').doc(Email);
            details.get()
            .then (doc => {
                if(!doc.exists){
                    console.log("Invalid email");
                } else {
                    const orders = doc.data().orderID;
                    const found = orders.find(element => element === trackOrder);
                    if(!found){
                        console.log("invalid order id");
                    }
                }
            })
            .catch(err => {
                console.log("Sorry some thing is not right", err);
                process.exit();
            })
        }
    }
    return result.fulfillmentText;
}

app.listen(process.env.PORT || 5000, () => {
    console.log(`app is running on port ${process.env.PORT}`);
});
