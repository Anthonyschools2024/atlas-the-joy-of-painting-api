# The Joy of Painting API (Node.js Edition)

This project provides a complete backend solution for "The Joy of Painting" episode database. It includes a Node.js script to perform an ETL (Extract, Transform, Load) process on raw data files and an Express.js API to serve the processed data with powerful filtering capabilities.

## Project Structure

For the scripts to work correctly, your project folder should be organized as follows:

joy-of-painting-project/
├── data/
│   ├── The Joy Of Painting - Episode Dates
│   ├── The Joy Of Painiting - Colors Used(1)
│   └── The Joy Of Painiting - Subject Matter
├── create_database.sql
├── etl_script.js
├── server.js
├── package.json
└── README.md


## Step-by-Step Setup Guide

Follow these steps in order to get the project running locally.

### Step 1: Prerequisites

-   **Node.js and npm**: You must have Node.js installed. You can download it from the official [Node.js website](https://nodejs.org/).
-   **PostgreSQL**: You need a running instance of PostgreSQL. You can download it from the [PostgreSQL website](https://www.postgresql.org/download/).

### Step 2: Database Setup

1.  **Create the Database**: Open your PostgreSQL terminal (`psql`) or a GUI tool (like DBeaver or Postico) and run the following command to create the database:
    ```sql
    CREATE DATABASE joy_of_painting;
    ```
2.  **Create Tables**: Connect to your newly created `joy_of_painting` database and run the entire `create_database.sql` script. This will set up all the necessary tables and relationships.

### Step 3: Project and Dependency Setup

1.  **Place Files**: Arrange all the project files (`etl_script.js`, `server.js`, `package.json`, etc.) in a single project folder as shown in the structure diagram above.
2.  **Install Dependencies**: Open your terminal in the main project folder and run the following command:
    ```bash
    npm install
    ```
    This command reads the `package.json` file and automatically installs all required libraries (Express, pg, cors, etc.).

### Step 4: Configure and Run the ETL Script

1.  **Edit Credentials**: Open `etl_script.js` in a text editor. At the top of the file, **update the database connection details** with your personal PostgreSQL username and password.
    ```javascript
    const pool = new Pool({
        user: 'postgres', // Your PostgreSQL username
        host: 'localhost',
        database: 'joy_of_painting',
        password: 'your_password', // IMPORTANT: Change this!
        port: 5432,
    });
    ```
2.  **Run the Script**: In your terminal, run the following command to populate your database. **This only needs to be done once.**
    ```bash
    node etl_script.js
    ```
    You will see log messages indicating the progress of the extraction, transformation, and loading steps.

### Step 5: Configure and Run the API Server

1.  **Edit Credentials**: Open `server.js` and update the database connection details at the top of the file (the same credentials you used in the ETL script).
2.  **Start the Server**: In your terminal, run the following command:
    ```bash
    node server.js
    ```
    The server will start, and you will see the message: `Server is running on http://localhost:5000`.

### Step 6: Test the API

Your API is now live and ready to be used. You can test the endpoints using a tool like Postman or by simply visiting the URLs in your web browser.

#### **Helper Endpoints**

-   **Get all subjects**: `http://localhost:5000/subjects`
-   **Get all colors**: `http://localhost:5000/colors`

#### **Main Filtering Endpoint**

-   **URL**: `http://localhost:5000/episodes`
-   **Query Parameters**:
    -   `months`: Comma-separated list of month numbers (e.g., `1` for January, `12` for December).
    -   `subjects`: Comma-separated list of subject names (e.g., `Mountain,River`).
    -   `colors`: Comma-separated list of color names (e.g., `Phthalo Blue,Titanium White`).
    -   `match_type`: `all` (default) or `any`.
        -   `all`: Returns episodes that match **all** criteria provided.
        -   `any`: Returns episodes that match **at least one** of the criteria provided.

#### **Example API Calls**

-   **Find episodes from January (1) that feature a "Cabin" AND "Snow":**
    `http://localhost:5000/episodes?months=1&subjects=Cabin,Snow&match_type=all`

-   **Find episodes that feature a "Waterfall" OR use the color "Sap Green":**
    `http://localhost:5000/episodes?subjects=Waterfall&colors=Sap Green&match_type=any`

-   **Find episodes from December (12) that use ALL of the following colors: "Prussian Blue", "Van Dyke Brown", AND "Alizarin Crimson":**
    `http://localhost:5000/episodes?months=12&colors=Prussian Blue,Van Dyke Brown,Alizarin Crimson&match_type=all`


