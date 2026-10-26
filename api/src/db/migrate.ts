import { createDatabase } from './index'

const connection = createDatabase()
connection.close()
console.log('Database migrations applied')
