const fs = require("fs")
const path = require("path")

// Criar diretórios para uploads
const uploadDirs = ["public/uploads", "public/uploads/avatars", "public/uploads/documents"]

uploadDirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
    console.log(`Diretório criado: ${dir}`)
  } else {
    console.log(`Diretório já existe: ${dir}`)
  }
})

// Criar arquivo .gitkeep para manter os diretórios no git
uploadDirs.forEach((dir) => {
  const gitkeepPath = path.join(process.cwd(), dir, ".gitkeep")
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, "")
    console.log(`Arquivo .gitkeep criado em: ${dir}`)
  }
})

console.log("Estrutura de diretórios de upload criada com sucesso!")
