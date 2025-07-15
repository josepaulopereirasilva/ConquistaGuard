const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const session = require('express-session');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' })); // Aumenta limite p/ imagens base64
app.use(cors());

app.use(session({
  secret: 'conquistaGuardCuidandoDeVoce',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Página inicial
app.get('/', (req, res) => {
  res.render('index');
});

// Página de equipamentos
app.get('/equipamentos', async (req, res) => {
  try {
    const produtos = await prisma.produtos.findMany();
    res.render('equipamentos', { produtos });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).send('Erro ao carregar produtos');
  }
});

// Página de produto individual
app.get('/produto/:nome', async (req, res) => {
  try {
    const nome = req.params.nome;
    const produto = await prisma.produtos.findFirst({
      where: { nome }
    });

    if (produto) {
      res.render('produto', { produto });
    } else {
      res.status(404).send('Produto não encontrado');
    }
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).send('Erro ao carregar produto');
  }
});

// Outras páginas
app.get('/sobre', (req, res) => {
  res.render('sobre');
});

app.get('/contato', (req, res) => {
  res.render('contato');
});

app.get('/editor', (req, res) => {
  res.render('loginEditor');
});

app.post('/loginEditor', async (req, res) => {
  const { nome, senha } = req.body;
  const login = await prisma.userAdmin.findFirst({
    where: { nome, senha }
  });

  if (login) {
    req.session.user = { nome: login.nome };
    res.json({ menssagem: 'Entrando...', sucesso: true });
  } else {
    res.json({ menssagem: 'Usuário não encontrado...' });
  }
});

// Painel admin com produtos
app.get('/admin', verificaLogin, async (req, res) => {
  try {
    const produtos = await prisma.produtos.findMany();
    res.render('painel', { produtos });
  } catch (error) {
    console.error('Erro ao buscar produtos no painel:', error);
    res.status(500).send('Erro ao carregar painel');
  }
});


// Middleware de login
function verificaLogin(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect('/editor');
  }
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

app.post('/admin/add', async (req, res) => {
  try {
    await prisma.produtos.create({
      data: {
        nome: '',
        preco: '',
        descricao: '',
        img: ''
      }
    });
    res.json({ success: true, message: 'Produto adicionado' });
  } catch (error) {
    console.error('Erro ao adicionar produto:', error);
    res.status(500).json({ success: false, message: 'Erro ao adicionar produto' });
  }
});

app.post('/admin/update/:id', async (req, res) => {
  const { id } = req.params;
  let { nome, preco, descricao, img, categoria, estoque } = req.body;

  // Garantir que img fique só com o base64 puro
  if (img) {
    if (img.startsWith('data:')) {
      img = img.split(',')[1];  // remove 'data:image/jpeg;base64,'
    }
  }

  try {
    await prisma.produtos.update({
      where: { id },
      data: {
        nome,
        preco,
        descricao,
        img,
        categoria,
        estoque
      }
    });

    res.json({ success: true, message: 'Produto atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar produto' });
  }
});

app.post('/admin/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.produtos.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Produto deletado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ success: false, message: 'Erro ao deletar produto' });
  }
});

app.get('/categoria/:nomeCategoria', async(req,res)=>{
  const categoria = req.params.nomeCategoria
  if(categoria !== 'todos'){
  const produtos = await prisma.produtos.findMany({
    where:{
      categoria:{
        contains:categoria,
        mode:"insensitive"
      }
    }
  })
  if(produtos){
    res.render("categorias",{produtos, categoria})
  }
  }
  else{
    const produtos = await prisma.produtos.findMany({
    where:{
      categoria:{
        contains:"",
        mode:"insensitive"
      }
    }
  })
  if(produtos){
    res.render("categorias",{produtos, categoria})
  }
  }
})