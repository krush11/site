const azure = require('azure-storage');
const Users = require('../models/users');
const Alum = require('../models/alum');
const Sponsors = require('../models/sponsors');
const Docs = require('../models/team_documents');
const bcrypt = require('bcrypt');

module.exports.profile = function (req, res) {
    if (req.isAuthenticated()) {
        Users.find().sort({ permission: 1, name: 1 }).then((user) => {
            Docs.find({}, function (err, document) {
                if (req.user.user == 'admin') {
                    Sponsors.find({}, function (err, sponsors) {
                            return res.status(200).render('profile', {
                                profile_user: user,
                                checkCorporateUser: true,
                                sponsors: sponsors,
                                documents: document
                            });
                        });
                }
                else if (req.user.dept == 'corporate') {
                    Sponsors.find({}, function (err, sponsors) {
                        return res.status(200).render('profile', {
                            profile_user: user,
                            checkCorporateUser: true,
                            sponsors: sponsors,
                            documents: document
                        });
                    });
                }
                else {
                    return res.status(200).render('profile', {
                        profile_user: user,
                        checkCorporateUser: false,
                        documents: document
                    });
                }
            });
        });
    }
    else res.status(401).redirect('/login');
};

module.exports.get_user = function (req, res) {
    try {
        Users.findOne({ user: `${req.params.username}` }, function (err, user) {
            if (user) {
                if (user.user != 'admin' && user.user != 'test') {
                    user.password = undefined;
                    user.permission = undefined;
                    user.createdAt = undefined;
                    user.updatedAt = undefined;
                    user.__v = undefined;
                    res.status(200).json(user);
                }
                else
                    res.status(403).send('Forbidden');
            }
            else
                res.status(404).send('User not found');
        });
    }
    catch (err) {
        res.status(500).send('Server error');
    }
}

module.exports.remove_user = function (req, res) {
    const parsed_url = req.url.split("/");
    Users.findByIdAndDelete(parsed_url[2], function (err, user) {
        var blobService = azure.createBlobService(process.env.AZURE_STORAGE_ACCOUNT, process.env.AZURE_STORAGE_ACCESS_KEY);
        const containerName = 'team-members';
        if (user.avatar && user.avatar != 'https://defianzdtusdc.blob.core.windows.net/team-members/placeholder.png') {
            const blobURL = user.avatar;
            let blob = blobURL.split('/');
            blob = blob[blob.length - 1];
            blobService.deleteBlob(containerName, blob, function (error) { });
        }
        if (err)
            res.status(503).render('error');
        else
            res.status(302).redirect('back');
    });
};

module.exports.logout = function (req, res) {
    req.logout();
    res.status(302).redirect('back');
};

module.exports.create = function (req, res) {
    var permission = 10;
    if (req.body.year == 1)
        permission = 9;
    if (req.body.year == 2)
        permission = 8;
    if (req.body.year == 3)
        permission = 7;
    if (req.body.year == 4)
        permission = 10;
    if (req.body.position.toLowerCase().includes('lead'))
        permission = 3;
    if (req.body.position.toLowerCase().includes('manager'))
        permission = 2;
    if (req.body.position.toLowerCase().includes('team lead'))
        permission = 1;
    var management = false;
    if (req.body.management)
        management = true;

    bcrypt.hash(req.body.password, 10).then(function (hash) {
        Users.create({
            "user": req.body.user,
            "name": req.body.name,
            "password": hash,
            "dept": req.body.dept,
            "year": req.body.year,
            "position": req.body.position,
            "permission": permission,
            "management": management
        });
    });
    res.status(200).redirect(`/user/profile/${req.user.user}`);
};

module.exports.update_details = async function (req, res) {
    let user = req.user;

    if (req.body.name)
        user.name = req.body.name;
    if (req.body.password)
        await bcrypt.hash(req.body.password, 10).then(function (hash) {
            user.password = hash;
        });
    if (req.body.insta)
        user.social.insta = req.body.insta;
    if (req.body.linkedin)
        user.social.linkedin = req.body.linkedin;
    if (req.body.twitter)
        user.social.twitter = req.body.twitter;
    user.save();

    res.status(302).redirect('back');
};

module.exports.upload_avatar = async function (req, res) {
    var user = await Users.findById(req.user._id);
    Users.uploadedAvatar(req, res, async function (err) {
        var blobService = azure.createBlobService(process.env.AZURE_STORAGE_ACCOUNT, process.env.AZURE_STORAGE_ACCESS_KEY);
        const containerName = 'team-members';
        if (user.avatar && user.avatar != 'https://defianzdtusdc.blob.core.windows.net/team-members/placeholder.png') {
            const blobURL = user.avatar;
            let blob = blobURL.split('/');
            blob = blob[blob.length - 1];
            blobService.deleteBlob(containerName, blob, function (error) { });
        }
        blobService.createBlockBlobFromLocalFile(containerName, `${req.user.user}-${req.file.originalname}`, `${req.file.path}`, function (err, result, response) {
            if (err) {
                res.status(503).render('error', {
                    error: true,
                    error_code: 503,
                    error_message: "The file you uploaded got destroyed in between. Please check your net connection speed or contact us if error still persists"
                });
            }
            else {
                var avatarUrl = blobService.getUrl("team-members", `${req.user.user}-${req.file.originalname}`);
                user.avatar = avatarUrl;
                user.save();
                res.status(201).redirect('/user');
            }
        });
    });
};

module.exports.add_team_doc = function (req, res) {
    const document = new Docs();
    Docs.uploadedFile(req, res, async function (err) {
        var blobService = azure.createBlobService(process.env.AZURE_STORAGE_ACCOUNT, process.env.AZURE_STORAGE_ACCESS_KEY);
        var containerName = 'team-documents';
        blobService.createBlockBlobFromLocalFile(containerName, `${req.file.originalname}`, `${req.file.path}`, function (err, result, response) {
            if (err)
                res.status(503).render('error', {
                    error: true,
                    error_code: 503,
                    error_message: "The file you uploaded got destroyed in between. Please check your net connection speed or contact us if error still persists"
                });
            else {
                var documentUrl = blobService.getUrl(containerName, `${req.file.originalname}`);
                document.file_name = req.file.originalname;
                document.remarks = req.body.remarks;
                document.location = documentUrl;
                document.posted_by = req.user.user;
                document.save();
                res.status(302).redirect('back');
            }
        });
    });
};

module.exports.add_alumni = function (req, res) {
    Alum.create({
        "name": req.body.name,
        "dept": req.body.dept,
        "linkedin": req.body.linkedin
    });
    res.status(200).redirect(`/user/profile/${req.user.user}`);
};

// This function is solely for testing and mannual DB changes.
// Tread carefully over this function.
module.exports.user_info = async function (req, res) {
    if (req.isAuthenticated() && (req.user.user == 'krush' || req.user.permission == 0)) {
        await Users.find().then(users => {
            res.status(200).send(users);
            for (i in users) {
                // console.log(users[i]);
                //     users[i].save();
            }
        });
    }
    else
        res.status(403).render('error', {
            error: true,
            error_code: 403,
            error_message: "Forbidden!! You do not have access to this page."
        });
};
