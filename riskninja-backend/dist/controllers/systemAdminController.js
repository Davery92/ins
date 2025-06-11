"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCompanyLicenses = exports.createCompany = exports.getAllCompanies = exports.getAllUsers = void 0;
const models_1 = require("../models");
/**
 * Get all users across all companies
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await models_1.UserModel.findAll({
            attributes: ['id', 'email', 'firstName', 'lastName', 'status', 'role', 'companyId', 'createdAt'],
            include: [{
                    model: models_1.CompanyModel,
                    as: 'company',
                    attributes: ['name', 'domain']
                }],
            order: [['createdAt', 'DESC']]
        });
        res.json({
            users: users.map(user => ({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status,
                role: user.role,
                companyId: user.companyId,
                company: user.company ? {
                    name: user.company.name,
                    domain: user.company.domain
                } : null,
                createdAt: user.createdAt
            }))
        });
    }
    catch (error) {
        console.error('Failed to get all users:', error);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
};
exports.getAllUsers = getAllUsers;
/**
 * Get all companies
 */
const getAllCompanies = async (req, res) => {
    try {
        const companies = await models_1.CompanyModel.findAll({
            attributes: ['id', 'name', 'domain', 'licenseCount', 'createdAt'],
            include: [{
                    model: models_1.UserModel,
                    as: 'users',
                    attributes: ['id', 'status', 'role']
                }],
            order: [['createdAt', 'DESC']]
        });
        res.json({
            companies: companies.map(company => {
                const users = company.users || [];
                const activeUsers = users.filter((user) => user.status === 'active').length;
                const totalUsers = users.length;
                const adminUsers = users.filter((user) => user.role === 'admin').length;
                return {
                    id: company.id,
                    name: company.name,
                    domain: company.domain,
                    licenseCount: company.licenseCount,
                    stats: {
                        totalUsers,
                        activeUsers,
                        adminUsers,
                        availableLicenses: Math.max(0, company.licenseCount - activeUsers)
                    },
                    createdAt: company.createdAt
                };
            })
        });
    }
    catch (error) {
        console.error('Failed to get all companies:', error);
        res.status(500).json({ error: 'Failed to retrieve companies' });
    }
};
exports.getAllCompanies = getAllCompanies;
/**
 * Create a new company
 */
const createCompany = async (req, res) => {
    const { name, domain, licenseCount = 0 } = req.body;
    try {
        if (!name || !domain) {
            res.status(400).json({ error: 'Company name and domain are required' });
            return;
        }
        // Check if domain already exists
        const existingCompany = await models_1.CompanyModel.findOne({
            where: { domain }
        });
        if (existingCompany) {
            res.status(400).json({ error: 'A company with this domain already exists' });
            return;
        }
        const company = await models_1.CompanyModel.create({
            name,
            domain,
            licenseCount: Math.max(0, licenseCount)
        });
        res.status(201).json({
            message: 'Company created successfully',
            company: {
                id: company.id,
                name: company.name,
                domain: company.domain,
                licenseCount: company.licenseCount,
                createdAt: company.createdAt
            }
        });
    }
    catch (error) {
        console.error('Failed to create company:', error);
        res.status(500).json({ error: 'Failed to create company' });
    }
};
exports.createCompany = createCompany;
/**
 * Update license count for a company
 */
const updateCompanyLicenses = async (req, res) => {
    const { companyId } = req.params;
    const { licenseCount } = req.body;
    try {
        if (licenseCount === undefined || licenseCount < 0) {
            res.status(400).json({ error: 'Valid license count is required' });
            return;
        }
        const company = await models_1.CompanyModel.findByPk(companyId);
        if (!company) {
            res.status(404).json({ error: 'Company not found' });
            return;
        }
        // Check if new license count is less than active users
        const activeUsers = await models_1.UserModel.count({
            where: { companyId, status: 'active' }
        });
        if (licenseCount < activeUsers) {
            res.status(400).json({
                error: `Cannot reduce licenses below active user count. Active users: ${activeUsers}`
            });
            return;
        }
        company.licenseCount = licenseCount;
        await company.save();
        res.json({
            message: 'License count updated successfully',
            company: {
                id: company.id,
                name: company.name,
                domain: company.domain,
                licenseCount: company.licenseCount,
                activeUsers
            }
        });
    }
    catch (error) {
        console.error('Failed to update company licenses:', error);
        res.status(500).json({ error: 'Failed to update licenses' });
    }
};
exports.updateCompanyLicenses = updateCompanyLicenses;
//# sourceMappingURL=systemAdminController.js.map