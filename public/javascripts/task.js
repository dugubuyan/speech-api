const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://127.0.0.1:27017/";

function getMedias(user){
    return getDocs("medias")
}
function getTasks(){
    return getDocs("task")
}
function insertTask(task, callback){
    return insertOneDoc("task", task, callback)
}
function getTaskByTaskId(task_id){
    return getOneDoc("task","task_id",task_id)
}
function getOneTaskByCondition(key, value){
    return getOneDoc("task", key, value)
}
function updateTaskResult(task_id, updObj){
    return updateOneDoc("task","task_id",task_id, updObj)
}
function getTaskByUser(user){
    return {txt:"txt"}
}
function login(){

}
function register(user){
    insertDocs("user", user)
}
function insertDocs(collection, objs){
    MongoClient.connect(url).then((conn) => {
        const dbo = conn.db("chains");
        dbo.collection(collection).insertMany(objs, function (err, res) {
            if (err) throw err;
            console.log("insert num: " + res.insertedCount);
        }).catch(err => {console.log("db operate fail", err);}).finally(()=> conn.close())
    }).catch((err) => {
        console.log("connect fail:", err);
    });
}
function insertOneDoc(collection, obj, callback){
    MongoClient.connect(url).then((conn) => {
        const dbo = conn.db("chains");
        console.log("insert one:", obj)
        dbo.collection(collection).insertOne(obj).then(res=>{
            console.log("insert result: " + JSON.stringify(res));
            callback(res.acknowledged)
            return res.insertedId
        }).catch(err => {console.log("db operate fail", err);})
            .finally(()=> conn.close())
    }).catch((err) => {
        console.log("connect fail:", err);
    });
}
async function getOneDoc(collection, key, value){
    const whereStr = new Object;
    whereStr[key] = value
    const conn = await MongoClient.connect(url).catch((err) => {
        console.log("connect fail:", err); throw err
    })
    console.log("where:", whereStr)
    const result = await conn.db("chains").collection(collection).find(whereStr).toArray()
        .catch(err => {console.log("db operate fail", err);})
        .finally(()=> conn.close())
    console.log("result:", result)
    if(result.length > 0){
        return result[0]
    }else{
        return null;
    }
}

async function getDocs(collection) {
    const conn = await MongoClient.connect(url).catch((err) => {
            console.log("connect fail:", err);
            throw err
        });
    return await conn.db("chains").collection(collection).find({}).toArray().catch(err => {
        console.log("db operate fail", err);throw err;
    }).finally(() => conn.close())
}
async function updateOneDoc(collection, key, value, updObject) {
    const conn = await MongoClient.connect(url).catch((err) => {
        console.log("connect fail:", err);
        throw err
    });
    const whereStr = new Object;
    whereStr[key] = value
    const updateStr = {$set: updObject};
    await conn.db("chains").collection(collection).updateOne(whereStr, updateStr).catch(err => {
        console.log("db operate fail", err);throw err;
    }).finally(() => conn.close())
}
function deleteOneDoc(collection, key, value){
    MongoClient.connect(url).then((conn)=>{
        const dbo = conn.db("chains");
        const whereStr = {key: value};
        dbo.collection("site").deleteOne(whereStr)
            .catch(err => {console.log("db operate fail", err);})
            .finally(()=> conn.close())
    }).catch((err) => {
        console.log("connect fail:", err)})
}

function deleteDocs(collection, status){
    MongoClient.connect(url).then((conn)=>{
        const dbo = conn.db("chains");
        const whereStr = {status: status};
        dbo.collection(collection).deleteMany(whereStr)
            .catch(err => {console.log("db operate fail", err);})
            .finally(()=> conn.close())
    }).catch((err) => {
        console.log("connect fail:", err)})
}
module.exports = {insertTask, getTasks, getTaskByTaskId, updateTaskResult, getOneTaskByCondition};