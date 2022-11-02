// This is a quick exploration to test the following:
// How does Joi work?
// Can I use Joi to auto-generate Swagger?
// If so, can I use said swagger easily with Express?
//
// I think it would be really nice if I can use the same object to generate documentation and validate input.

const express = require('express')
const swaggerUi = require('swagger-ui-express')
const Joi = require('joi')
const j2s = require('joi-to-swagger')

// Create express
const app = express()

// Add ability to parse JSON post request bodies.
app.use(express.json())

// Begin defining the swagger spec.
// Bootstrapped at https://editor.swagger.io/
const swaggerDocument = {
  "openapi": "3.0.3",
  "info": {
    "title": "Swagger Petstore - OpenAPI 3.0",
    "description": "Trying out Joi with Swagger in Express",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:3000"
    }
  ],
  "tags": [
    {
      "name": "pet",
      "description": "Everything about your Pets"
    }
  ],
  "paths": {},
  "components": {
    schemas: {}
  }
}

app.get('/', (req, res) => {
  res.send('Petstore 1.0!')
})

// Define Joi schema for pet.
const commonPetFields = {
  name:    Joi.string(),
  status:  Joi.string().valid('available', 'pending', 'sold'),
}
const Pet = Joi.object().keys({
  id:      Joi.number().integer().positive().required(),
  ...commonPetFields
})
// Add pet schema to the swagger doc.
const petJ2S = j2s(Pet, swaggerDocument.components)
swaggerDocument.components.schemas.Pet = petJ2S.swagger

// Define Joi schema for new pet.
// Pet and NewPet are different schemas because I don't want users sending in their own ids when creating pets.  NewPet omits the id field.
const NewPet = Joi.object().keys({
  ...commonPetFields
})
// Add new pet schema to the swagger doc.
const newPetJ2S = j2s(NewPet, swaggerDocument.components)
swaggerDocument.components.schemas.NewPet = newPetJ2S.swagger

// This is neat! If I update a schema above, then BOTH my docs and my validation code get updated!

// Create an in-memory store for pets.
const pets = {
  '1': {
    id: 1,
    name: 'The Dog',
    status: 'sold'
  },
  '2': {
    id: 2,
    name: 'The Cat',
    status: 'available'
  }
}

// Add an express route to get a pet.
app.get('/pet/:petId', (req, res) => {
  res.send(pets[req.params.petId])
})
// Add swagger spec for the route.
// I feel like this is a bit messy here, but I do like it better than JSDoc
// because I didn't have to keep track of indentation while writing it and
// this seems more readable with syntax highlighting.
swaggerDocument.paths['/pet/{petId}'] = {
  "get": {
    "tags": [
      "pet"
    ],
    "summary": "Find pet by ID",
    "description": "Returns a single pet",
    "parameters": [
      {
        "name": "petId",
        "in": "path",
        "description": "ID of pet to return",
        "required": true,
        "schema": {
          "type": "integer",
          "format": "int64"
        }
      }
    ],
    "responses": {
      "200": {
        "description": "successful operation",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Pet"
            }
          }
        }
      },
    }
  }
}

// Add an express route to create a new pet.
app.post('/pets', (req, res) => {
  const newPet = req.body
  const { error, value } = NewPet.validate(newPet)
  if (error) {
    return res.status(400).send(error)
  }
  id = Object.keys(pets).length + 1
  newPet.id = id
  pets[id + ''] = newPet
  res.send(newPet)
})
swaggerDocument.paths['/pets'] = {
  "post": {
    "tags": [
      "pet"
    ],
    "summary": "Add a new pet to the store",
    "description": "Add a new pet to the store",
    "requestBody": {
      "description": "Create a new pet in the store",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/Pet"
          }
        }
      }
    },
    "responses": {
      "200": {
        "description": "successful operation",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/Pet"
            }
          }
        }
      },
    }
  }
}

// Mount swagger at /api-docs using the document we have constructed.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

// Start the express server.
const port = 3000
app.listen(port, () => {
    console.log(`Petstore app listening on port ${port}`)
})
