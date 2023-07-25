const os = require('os');
function getIpAddress() {
    let ifaces = os.networkInterfaces()
    for (let dev in ifaces) {
        let iface = ifaces[dev]
        // console.info(dev, "====>",iface)
        for (let i = 0; i < iface.length; i++) {
            let { family, address, internal,netmask } = iface[i]
            // console.log(address)
            if (family === 'IPv4' &&netmask==='255.255.255.255' && !internal) {
                return address
            }
        }
    }
}
const baseurl = 'http://' + getIpAddress() + ':3000'
function getStaticUrl(){
    return baseurl + "/uploads/";
}
// console.log(getStaticUrl())
function test(){
    const str = "12434.xyz-789"
    console.log(str.replace(".xyz",""))
}
module.exports = {getStaticUrl}
