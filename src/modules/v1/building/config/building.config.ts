import { registerAs } from "@nestjs/config";


export default registerAs('building', () => ({
    updateDuration: 30 // 單位為天數
}))