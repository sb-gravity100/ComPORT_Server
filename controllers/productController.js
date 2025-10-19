import Product from '../models/Product.js';
import Review from '../models/Review.js';

// @desc    Get all products with filters
// @route   GET /api/products
export const getProducts = async (req, res) => {
   try {
      const {
         category,
         minPrice,
         maxPrice,
         search,
         sort,
         shopName,
         inStockOnly,
      } = req.query;

      const query = {};

      if (category) query.category = category;

      if (minPrice || maxPrice) {
         query['priceRange.average'] = {};
         if (minPrice) query['priceRange.average'].$gte = Number(minPrice);
         if (maxPrice) query['priceRange.average'].$lte = Number(maxPrice);
      }

      if (search) {
         query.$text = { $search: search };
      }

      if (shopName) {
         query['sources.shopName'] = shopName;
      }

      if (inStockOnly === 'true') {
         query['sources.inStock'] = true;
      }

      let sortOption = {};
      if (sort === 'price_asc') sortOption['priceRange.average'] = 1;
      else if (sort === 'price_desc') sortOption['priceRange.average'] = -1;
      else if (sort === 'rating') sortOption['ratings.overall.average'] = -1;
      else if (sort === 'availability') sortOption.availableAt = -1;
      else sortOption.createdAt = -1;

      const products = (await Product.find(query).sort(sortOption)).map((x) => {
         const v = x.toJSON();
         const z = {};
         if (shopName) {
            z.availableAt = 0;
            z.sources = v.sources.filter((a) => a.shopName === shopName);
            z.availableAt = z.sources.filter((a) => a.inStock).length;
            console.log(v.availableAt);
         }
         return { ...v, ...z };
      });

      res.json({
         success: true,
         count: products.length,
         products,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Get single product with all sources
// @route   GET /api/products/:id
export const getProduct = async (req, res) => {
   try {
      const product = await Product.findById(req.params.id).populate({
         path: 'platformReviews',
         populate: { path: 'user', select: 'username' },
      });

      if (!product) {
         return res.status(404).json({
            success: false,
            message: 'Product not found',
         });
      }

      // Sort sources by price
      product.sources.sort((a, b) => a.price - b.price);

      res.json({
         success: true,
         product,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Get product comparison across shops
// @route   GET /api/products/:id/compare
export const compareProductSources = async (req, res) => {
   try {
      const product = await Product.findById(req.params.id);

      if (!product) {
         return res.status(404).json({
            success: false,
            message: 'Product not found',
         });
      }

      const comparison = {
         productName: product.name,
         brand: product.brand,
         model: product.model,
         priceRange: product.priceRange,
         sources: product.sources
            .map((source) => ({
               shop: source.shopName,
               price: source.price,
               inStock: source.inStock,
               url: source.productUrl,
               shipping: source.shipping,
               rating: product.ratings.bySource.find(
                  (r) => r.shopName === source.shopName
               ),
               lastUpdated: source.lastUpdated,
            }))
            .sort((a, b) => a.price - b.price),
         bestDeal: null,
      };

      // Calculate best deal (lowest price + shipping)
      const dealsWithShipping = comparison.sources
         .filter((s) => s.inStock)
         .map((s) => ({
            ...s,
            totalCost: s.price + (s.shipping?.cost || 0),
         }));

      if (dealsWithShipping.length > 0) {
         comparison.bestDeal = dealsWithShipping.reduce((best, current) =>
            current.totalCost < best.totalCost ? current : best
         );
      }

      res.json({
         success: true,
         comparison,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Get products grouped by similarity
// @route   GET /api/products/grouped
export const getGroupedProducts = async (req, res) => {
   try {
      const { category, search } = req.query;
      const query = {};

      if (category) query.category = category;
      if (search) query.$text = { $search: search };

      const products = await Product.find(query);

      // Group by groupKey
      const grouped = products.reduce((acc, product) => {
         const key = product.groupKey;
         if (!acc[key]) {
            acc[key] = {
               groupKey: key,
               name: product.name,
               brand: product.brand,
               model: product.model,
               category: product.category,
               products: [],
            };
         }
         acc[key].products.push(product);
         return acc;
      }, {});

      const result = Object.values(grouped);

      res.json({
         success: true,
         count: result.length,
         groups: result,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Add or update a product source
// @route   POST /api/products/:id/sources
export const addProductSource = async (req, res) => {
   try {
      const { shopName, shopUrl, productUrl, price, inStock, shipping } =
         req.body;

      const product = await Product.findById(req.params.id);

      if (!product) {
         return res.status(404).json({
            success: false,
            message: 'Product not found',
         });
      }

      // Check if source already exists
      const existingSourceIndex = product.sources.findIndex(
         (s) => s.shopName === shopName
      );

      if (existingSourceIndex !== -1) {
         // Update existing source
         product.sources[existingSourceIndex] = {
            shopName,
            shopUrl,
            productUrl,
            price,
            inStock,
            shipping,
            lastUpdated: new Date(),
         };
      } else {
         // Add new source
         product.sources.push({
            shopName,
            shopUrl,
            productUrl,
            price,
            inStock,
            shipping,
         });
      }

      // Update price range
      product.updatePriceRange();
      await product.save();

      res.json({
         success: true,
         product,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Create product review (platform review)
// @route   POST /api/products/:id/reviews
export const createReview = async (req, res) => {
   try {
      const { rating, comment, comfortRatings } = req.body;
      const productId = req.params.id;

      const product = await Product.findById(productId);
      if (!product) {
         return res.status(404).json({
            success: false,
            message: 'Product not found',
         });
      }

      // Check if user already reviewed
      const existingReview = await Review.findOne({
         user: req.user._id,
         product: productId,
      });

      if (existingReview) {
         return res.status(400).json({
            success: false,
            message: 'You have already reviewed this product',
         });
      }

      const review = await Review.create({
         user: req.user._id,
         product: productId,
         rating,
         comment,
         comfortRatings,
      });

      product.platformReviews.push(review._id);
      await product.save();

      res.status(201).json({
         success: true,
         review,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Get product reviews (platform reviews only)
// @route   GET /api/products/:id/reviews
export const getReviews = async (req, res) => {
   try {
      const reviews = await Review.find({ product: req.params.id })
         .populate('user', 'username')
         .sort('-createdAt');

      res.json({
         success: true,
         count: reviews.length,
         reviews,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Get available shops
// @route   GET /api/products/shops/list
export const getShops = async (req, res) => {
   try {
      const shops = await Product.distinct('sources.shopName');

      const shopDetails = await Promise.all(
         shops.map(async (shopName) => {
            const products = await Product.find({
               'sources.shopName': shopName,
            });

            return {
               name: shopName,
               productCount: products.length,
               availableCount: products.filter((p) =>
                  p.sources.find((s) => s.shopName === shopName && s.inStock)
               ).length,
            };
         })
      );

      res.json({
         success: true,
         count: shopDetails.length,
         shops: shopDetails,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};
