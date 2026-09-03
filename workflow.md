# Master Workflow & Architecture: Indian Artisan Fair-Price ML System

This document combines the **Fair-Price ML Workflow** and **Implementation Specifications** into an end-to-end blueprint for pricing Indian artisanal and handcrafted products in Indian Rupees (`₹`).

---

## 1. System Inputs & Outputs

- **Artisan Inputs**:
  - `category` (Brassware, Sarees & Textiles, Pottery & Ceramics, Paintings & Folk Art, Woodcraft, Handmade Jewelry, Stonecraft, Leathercraft)
  - `title` & `description` (Detailed text describing item attributes)
  - `material` (e.g., Dhokra brass, Panchaloha, Chanderi silk, Banarasi silk, Kanjeevaram silk, Terracotta, Blue pottery, Sandalwood, Teak, Rosewood, Makrana marble)
  - `technique` (e.g., Lost-wax casting, Bidriware, Zardozi, Chikankari, Madhubani painting, Pattachitra, Warli art, Kalamkari, Ajrakh block print, Sanganeri print, Channapatna wood turning, Silver filigree/Tarakasi, Tanjore painting, Meenakari)
  - `size` (Small, Medium, Large)
  - `materials_cost` (in INR ₹)
  - `labor_hours` (Artisan hours spent crafting the item)
  - `hourly_wage` (Target wage rate in INR ₹/hr, default: ₹250.00/hr)
  - `seller_rating` & `review_count` (Shop reputation metrics)
- **Model Output**:
  - `net_cost_floor_formatted` (Guaranteed minimum price in ₹ including platform/GST fees)
  - `recommended_price_range` (**Low ($P_{15}$)** – **Median ($P_{50}$)** – **High ($P_{85}$)** in INR ₹)
  - `live_comps_summary` (Live Google Shopping India comparable listings retrieved via SerperAPI)

---

## 2. Exhaustive Indian Handicrafts Vocabulary

The model recognizes craft materials, styles, and techniques across all regions of India:

| Region / Craft Tradition | Featured Materials | Recognized Techniques & Artforms |
| :--- | :--- | :--- |
| **Metalcraft (Odisha, Telangana, UP)** | Brass, Copper, Bronze, Panchaloha, Bell metal, Kansa, Silver filigree. | Dhokra / Dokra lost-wax casting, Bidriware, Tarkashi, Tarakasi, Meenakari, Repousse. |
| **Textiles & Sarees (MP, UP, TN, WB, Gujarat)** | Chanderi silk, Banarasi silk, Tussar silk, Kanjeevaram silk, Muga silk, Kantha cotton, Mulmul, Khadi, Pashmina. | Zardozi, Chikankari, Kantha embroidery, Phulkari, Gota patti, Ajrakh & Bagh block printing, Bandhani, Ikat, Kalamkari, Brocade. |
| **Pottery & Ceramics (Rajasthan, UP, WB)** | Terracotta, Red clay, Blue pottery, Quartz, Ceramic, Stoneware. | Jaipur Blue pottery, Khurja pottery, Nizamabad black pottery, Pokhran pottery, Terracotta moulding. |
| **Woodcraft & Toys (Karnataka, AP, UP)** | Teak wood, Rosewood, Sheesham, Sandalwood, Mango wood, Bamboo, Cane. | Channapatna lacquerware toys, Saharanpur wood carving, Kondapalli & Etikoppaka toys, Wood inlay (Marquetry). |
| **Paintings & Folk Art (Bihar, Odisha, TN, MH)** | Paper-mache, Sholapith, Cloth canvas, Palm leaf, Natural pigments. | Madhubani / Mithila painting, Pattachitra, Tanjore painting, Kalamkari art, Warli art, Gond art, Phad, Pichwai. |
| **Stonecraft & Jewelry (Rajasthan, Odisha)** | Makrana marble, Soapstone, Slate, Black stone, Lapis lazuli, Turquoise. | Marble inlay (Pietra dura), Soapstone carving, Filigree ornament crafting. |

---

## 3. Model Selection & Architecture Comparison

### Why CatBoost over LightGBM for Artisan Data?

| Model | Categorical Handling | Text Token Processing | Overfitting Risk on Small Data | Benchmark MAE (INR ₹) | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LightGBM** | Native integer encoding, requires pre-one-hot/target encoding for text. | Low native support. | High on small/medium tabular datasets. | ₹25.03 | Secondary Baseline |
| **XGBoost** | Depth-wise tree growth, requires manual encoding. | External feature matrices needed. | Moderate regularization tuning needed. | ₹20.37 | Secondary Baseline |
| **CatBoost** | **Ordered Target Encoding** (handles multi-categorical text tokens natively). | Built-in text feature processing. | **Lowest risk**; excellent default regularization. | **₹10.59 (2x lower error)** | **Primary Production Model** |

---

## 4. Operational Commands to Demonstrate the Model

### 1. Interactive Web Application (Recommended for Demonstration)
Runs a full visual web dashboard in the browser with interactive sliders, inputs, metric cards, and live comps tables:
```bash
streamlit run web_app.py
```

### 2. Command Line Demo
Runs instant predictions in the terminal for sample artisan items:
```bash
python app.py
```

### 3. Model Benchmark & Metrics Evaluation
Evaluates CatBoost vs LightGBM vs XGBoost metrics:
```bash
python evaluate.py
```
