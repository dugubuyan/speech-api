const os = require('os');
function getIpAddress() {
    let ifaces = os.networkInterfaces()
    for (let dev in ifaces) {
        let iface = ifaces[dev]
        for (let i = 0; i < iface.length; i++) {
            let { family, address, internal } = iface[i]
            if (family === 'IPv4' && address !== '127.0.0.1' && !internal) {
                return address
            }
        }
    }
}
const baseurl = 'http://' + getIpAddress() + ':3000'
function getStaticUrl(){
    return baseurl + "/uploads/";
}

function test(){
    const str = "12434.xyz-789"
    console.log(str.replace(".xyz",""))
}
module.exports = {getStaticUrl}