const { generateToken } = require("../config/jwtToken");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongodbId");
const { generateRefreshToken } = require("../config/refreshToken");
const jwt = require("jsonwebtoken")

const createUser = asyncHandler(async (req, res) => {
  console.log("createUser controller", req.body);

  const email = req.body.email;
  const findUser = await User.findOne({ email });
  if (!findUser) {
    // create new user
    const newUser = await User.create(req.body);
    return res.json(newUser);
  } else {
    // user already exist
    throw new Error("User already exist");
  }
});

const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // check if user exists or not
  const findUser = await User.findOne({ email });
  if (findUser && (await findUser.isPasswordMatched(password))) {
    const refreshToken = generateRefreshToken(findUser?._id);
    const updateUser = await User.findByIdAndUpdate(
      findUser?._id,
      {
        refreshToken: refreshToken,
      },
      {
        new: true,
      }
    );
    res.cookie("refreshToken",refreshToken,{
      httpOnly: true,
      maxAge: 72*60*60*1000
    })
    res.json({
      _id: findUser._id,
      firstname: findUser?.firstname,
      lastname: findUser?.lastname,
      email: findUser?.email,
      mobile: findUser?.mobile,
      token: generateToken(findUser?._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});


//  handle refresh Token

const handleRefreshToken = asyncHandler(async(req, res)=>{
  const cookie = req.cookies;
  if(!cookie?.refreshToken){
    throw new Error("No refresh token in cookies")
  }
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({refreshToken});
  if(!user){
    throw new Error("No refresh token is present in DB or not matched")
  }
  jwt.verify(refreshToken,process.env.JWT_SECRET,(err,decoded)=>{
    console.log("decoded",decoded)
    if(err || user.id !== decoded.id){
      throw new Error('There is something wrong with refresh token')
    }
    const accessToken = generateToken(user?._id);

    res.json({accessToken})
  })
})


// logout functionality

const logout = asyncHandler(async(req,res)=>{
  const cookie = req.cookies;
  if(!cookie?.refreshToken){
    throw new Error("No refresh token in cookies")
  }
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({refreshToken});

  if(!user){
    res.clearCookie('refreshToken',{
      httpOnly: true,
      secure : true
    })
    return res.sendStatus(204)
  }
  await User.findOneAndUpdate({refreshToken},{
    refreshToken : ""
  })
  res.clearCookie('refreshToken',{
    httpOnly: true,
    secure : true
  })
  return res.sendStatus(200)
 


})


// update a user

const updatedUser = asyncHandler(async (req, res) => {
  const { _id } = req?.user;
  validateMongoDbId(_id);
  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        firstname: req?.body?.firstname,
        lastname: req?.body?.lastname,
        email: req?.body?.email,
        mobile: req?.body?.mobile,
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

// Get all users
const getAllUser = asyncHandler(async (req, res) => {
  try {
    const getUsers = await User.find();
    res.json(getUsers);
  } catch (error) {
    throw new Error(error);
  }
});

// get a single user
const getaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const getaUser = await User.findById(id);
    res.json({
      getaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

//  delete a user
const deleteaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    console.log("delete id", id);
    const deleteaUser = await User.findByIdAndDelete(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const block = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: true,
      },
      {
        new: true,
      }
    );
    res.json({
      message: "User Blocked",
      updated: block,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    const unblock = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: false,
      },
      {
        new: true,
      }
    );
    res.json({
      message: "User Unblocked",
      updated: unblock,
    });
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  createUser,
  loginUserCtrl,
  getAllUser,
  getaUser,
  deleteaUser,
  updatedUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout
};
