const serviceAccount = require('./x100-jetti-firebase-adminsdk.json');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

let docRef = db.collection('users1').doc('alovelace');
let setAda = docRef.set({
  first: 'Ada',
  last: 'Lovelace',
  born: 1815
}).then(() => {
  console.info('Ok')
});

