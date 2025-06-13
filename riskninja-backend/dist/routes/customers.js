"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const underwritingController_1 = require("../controllers/underwritingController");
const auth_1 = require("../middleware/auth");
const checkLicense_1 = require("../middleware/checkLicense");
const models_1 = require("../models");
const router = (0, express_1.Router)();
// Underwriting Report routes
router.get('/:id/underwriting-reports', auth_1.authenticateToken, checkLicense_1.checkLicense, underwritingController_1.getUnderwritingReports);
router.post('/:id/underwriting-reports', auth_1.authenticateToken, checkLicense_1.checkLicense, underwritingController_1.createUnderwritingReport);
// GET /api/customers - get all customers and prospects for the user
router.get('/', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const customers = await models_1.CustomerModel.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });
        res.json(customers);
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});
// POST /api/customers - create a new customer or prospect
router.post('/', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, type, email, phone, company, status, lastContact } = req.body;
        const customer = await models_1.CustomerModel.create({
            userId,
            name,
            type,
            email,
            phone,
            company,
            status: status || (type === 'customer' ? 'active' : 'lead'),
            lastContact: lastContact ? new Date(lastContact) : new Date(),
        });
        res.status(201).json(customer);
    }
    catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: 'Failed to create customer' });
    }
});
// PUT /api/customers/:id - update a customer
router.put('/:id', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { name, type, email, phone, company, status, lastContact } = req.body;
        const customer = await models_1.CustomerModel.findOne({ where: { id, userId } });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        await customer.update({
            name,
            type,
            email,
            phone,
            company,
            status,
            lastContact: lastContact ? new Date(lastContact) : customer.lastContact,
        });
        res.json(customer);
    }
    catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});
// DELETE /api/customers/:id - delete a customer
router.delete('/:id', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const customer = await models_1.CustomerModel.findOne({ where: { id, userId } });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        await customer.destroy();
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});
// GET /api/customers/:id/documents - get documents for a specific customer
router.get('/:id/documents', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        // Verify customer belongs to user
        const customer = await models_1.CustomerModel.findOne({ where: { id, userId } });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const documents = await models_1.PolicyDocumentModel.findAll({
            where: { customerId: id, userId },
            order: [['uploadedAt', 'DESC']]
        });
        res.json(documents);
    }
    catch (error) {
        console.error('Error fetching customer documents:', error);
        res.status(500).json({ error: 'Failed to fetch customer documents' });
    }
});
// GET /api/customers/:id/chats - get chat sessions for a specific customer
router.get('/:id/chats', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        // Verify customer belongs to user
        const customer = await models_1.CustomerModel.findOne({ where: { id, userId } });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const chatSessions = await models_1.ChatSessionModel.findAll({
            where: { customerId: id, userId },
            include: [
                {
                    model: models_1.ChatMessageModel,
                    as: 'messages',
                    attributes: ['content', 'timestamp', 'sender'],
                    order: [['timestamp', 'DESC']],
                    limit: 1,
                    required: false
                }
            ],
            order: [['updatedAt', 'DESC']]
        });
        // Transform the results to include lastMessage
        const formattedSessions = chatSessions.map(session => {
            const sessionData = session.toJSON();
            const lastMessage = sessionData.messages && sessionData.messages.length > 0
                ? sessionData.messages[0].content
                : null;
            return {
                ...sessionData,
                lastMessage,
                messages: undefined // Remove full messages array since we only need lastMessage
            };
        });
        res.json(formattedSessions);
    }
    catch (error) {
        console.error('Error fetching customer chats:', error);
        res.status(500).json({ error: 'Failed to fetch customer chats' });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map