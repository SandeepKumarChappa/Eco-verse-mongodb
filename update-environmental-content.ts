import 'dotenv/config';
import mongoose from 'mongoose';
import { LearningModule } from './server/models/LearningModule';

const environmentalModulesContent = [
  {
    title: "MULTIDISCIPLINARY NATURE OF ENVIRONMENTAL STUDIES",
    description: "Understanding the multidisciplinary nature of environmental studies and the need for public awareness",
    lessons: [
      {
        title: "Definition",
        duration: "12 minutes",
        points: 80,
        content: `
          <h2>Definition of Environmental Studies</h2>
          <p>Environmental studies is an interdisciplinary field that examines the interactions between humans and their natural environment. It combines elements from various disciplines to understand complex environmental issues.</p>

          <h3>Key Characteristics</h3>
          <ul>
            <li><strong>Interdisciplinary:</strong> Draws from multiple academic fields</li>
            <li><strong>Holistic:</strong> Considers the entire environmental system</li>
            <li><strong>Applied:</strong> Focuses on real-world solutions</li>
            <li><strong>Dynamic:</strong> Addresses constantly changing environmental conditions</li>
          </ul>

          <h3>Core Components</h3>
          <p>The field encompasses ecological principles, environmental policies, sustainable development, and human-environment interactions. It seeks to understand how human activities impact natural systems and develop strategies for environmental protection.</p>

          <h3>Scope and Importance</h3>
          <p>Environmental studies addresses critical global challenges including climate change, biodiversity loss, pollution, and resource depletion. It provides the knowledge base for informed decision-making and sustainable development practices.</p>
        `
      },
      {
        title: "Scope",
        duration: "15 minutes",
        points: 85,
        content: `
          <h2>The Broad Scope of Environmental Studies</h2>
          <p>Environmental studies encompasses a wide range of topics and approaches, from local conservation efforts to global environmental policy.</p>

          <h3>Major Areas of Study</h3>
          <ul>
            <li><strong>Ecology:</strong> Study of organisms and their environments</li>
            <li><strong>Environmental Chemistry:</strong> Chemical processes in the environment</li>
            <li><strong>Environmental Geology:</strong> Geological aspects of environmental issues</li>
            <li><strong>Environmental Economics:</strong> Economic analysis of environmental problems</li>
            <li><strong>Environmental Law:</strong> Legal frameworks for environmental protection</li>
            <li><strong>Environmental Engineering:</strong> Technological solutions to environmental problems</li>
          </ul>

          <h3>Cross-Disciplinary Connections</h3>
          <p>The field integrates knowledge from natural sciences, social sciences, and humanities to provide comprehensive understanding of environmental issues and their solutions.</p>
        `
      },
      {
        title: "Importance",
        duration: "14 minutes",
        points: 80,
        content: `
          <h2>Why Environmental Studies Matters</h2>
          <p>Environmental studies plays a crucial role in addressing the most pressing challenges facing humanity in the 21st century.</p>

          <h3>Global Challenges</h3>
          <ul>
            <li><strong>Climate Change:</strong> Understanding and mitigating global warming</li>
            <li><strong>Biodiversity Loss:</strong> Protecting species and ecosystems</li>
            <li><strong>Resource Depletion:</strong> Sustainable management of natural resources</li>
            <li><strong>Pollution Control:</strong> Managing environmental contaminants</li>
          </ul>

          <h3>Societal Benefits</h3>
          <p>Environmental studies contributes to public health, economic development, social equity, and long-term sustainability. It provides the knowledge needed for informed policy-making and responsible environmental stewardship.</p>
        `
      },
      {
        title: "Need for Public Awareness",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>The Critical Need for Environmental Awareness</h2>
          <p>Public awareness is essential for effective environmental protection and sustainable development.</p>

          <h3>Why Awareness Matters</h3>
          <ul>
            <li><strong>Informed Decision Making:</strong> Citizens make better environmental choices</li>
            <li><strong>Policy Support:</strong> Public pressure drives environmental legislation</li>
            <li><strong>Behavioral Change:</strong> Awareness leads to sustainable practices</li>
            <li><strong>Community Action:</strong> Collective efforts amplify environmental impact</li>
          </ul>

          <h3>Strategies for Building Awareness</h3>
          <p>Education, media campaigns, community programs, and personal engagement all contribute to increasing environmental awareness and fostering a culture of environmental responsibility.</p>
        `
      }
    ]
  },
  {
    title: "NATURAL RESOURCES: RENEWABLE AND NON-RENEWABLE RESOURCES",
    description: "Comprehensive study of natural resources, their problems, and conservation strategies",
    lessons: [
      {
        title: "Natural resources and Associated problems",
        duration: "18 minutes",
        points: 90,
        content: `
          <h2>Natural Resources and Their Challenges</h2>
          <p>Natural resources are essential for human survival and economic development, but their exploitation creates significant environmental and social problems.</p>

          <h3>Types of Natural Resources</h3>
          <ul>
            <li><strong>Renewable Resources:</strong> Can be replenished naturally (solar, wind, water)</li>
            <li><strong>Non-renewable Resources:</strong> Finite supplies (fossil fuels, minerals)</li>
            <li><strong>Perpetual Resources:</strong> Continuously available (solar energy, tidal energy)</li>
          </ul>

          <h3>Major Problems</h3>
          <p>Overexploitation, pollution, climate change, and inequitable distribution create complex challenges that require integrated management approaches.</p>
        `
      },
      {
        title: "Forest Resources",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Forest Resources: Earth's Green Lungs</h2>
          <p>Forests are vital ecosystems that provide numerous ecological, economic, and social benefits.</p>

          <h3>Forest Functions</h3>
          <ul>
            <li><strong>Biodiversity Conservation:</strong> Habitat for millions of species</li>
            <li><strong>Climate Regulation:</strong> Carbon sequestration and oxygen production</li>
            <li><strong>Water Cycle:</strong> Regulation of water flow and quality</li>
            <li><strong>Economic Value:</strong> Timber, medicines, and other products</li>
          </ul>

          <h3>Threats and Conservation</h3>
          <p>Deforestation, forest degradation, and climate change threaten forest ecosystems. Sustainable forest management and reforestation are essential for conservation.</p>
        `
      },
      {
        title: "Water Resources",
        duration: "17 minutes",
        points: 85,
        content: `
          <h2>Water Resources: The Essence of Life</h2>
          <p>Water is fundamental to all life forms and human civilization, yet freshwater scarcity affects billions of people worldwide.</p>

          <h3>Water Distribution</h3>
          <ul>
            <li><strong>Ocean Water:</strong> 97% of Earth's water, saline and not directly usable</li>
            <li><strong>Freshwater:</strong> Only 3%, mostly in glaciers and groundwater</li>
            <li><strong>Surface Water:</strong> Rivers, lakes, and reservoirs</li>
          </ul>

          <h3>Water Challenges</h3>
          <p>Pollution, over-extraction, climate change, and poor management threaten water security. Integrated water resource management is crucial for sustainable use.</p>
        `
      },
      {
        title: "Mineral Resources",
        duration: "15 minutes",
        points: 80,
        content: `
          <h2>Mineral Resources: Building Blocks of Modern Society</h2>
          <p>Minerals are essential raw materials for industry, technology, and infrastructure development.</p>

          <h3>Types of Minerals</h3>
          <ul>
            <li><strong>Metallic Minerals:</strong> Iron, copper, gold, aluminum</li>
            <li><strong>Non-metallic Minerals:</strong> Limestone, gypsum, mica</li>
            <li><strong>Fuel Minerals:</strong> Coal, petroleum, natural gas</li>
          </ul>

          <h3>Mining Impacts</h3>
          <p>Mining activities can cause environmental degradation, habitat destruction, and pollution. Sustainable mining practices and recycling reduce environmental impacts.</p>
        `
      },
      {
        title: "Food Resources",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Food Resources: Feeding the World</h2>
          <p>Agriculture and food production systems must balance human needs with environmental sustainability.</p>

          <h3>Food Production Systems</h3>
          <ul>
            <li><strong>Traditional Agriculture:</strong> Sustainable but low-yield methods</li>
            <li><strong>Industrial Agriculture:</strong> High-yield but resource-intensive</li>
            <li><strong>Sustainable Agriculture:</strong> Balances productivity and environmental health</li>
          </ul>

          <h3>Global Challenges</h3>
          <p>Population growth, climate change, and resource constraints threaten food security. Sustainable agriculture practices are essential for long-term food production.</p>
        `
      },
      {
        title: "Energy Resources",
        duration: "17 minutes",
        points: 85,
        content: `
          <h2>Energy Resources: Powering Development</h2>
          <p>Energy is fundamental to modern society, but fossil fuel dependence creates environmental and economic challenges.</p>

          <h3>Energy Sources</h3>
          <ul>
            <li><strong>Fossil Fuels:</strong> Coal, oil, natural gas (non-renewable)</li>
            <li><strong>Renewable Energy:</strong> Solar, wind, hydro, biomass</li>
            <li><strong>Nuclear Energy:</strong> Low-carbon but controversial</li>
          </ul>

          <h3>Energy Transition</h3>
          <p>Shifting from fossil fuels to renewable energy sources is essential for climate change mitigation and sustainable development.</p>
        `
      },
      {
        title: "Land Resources",
        duration: "14 minutes",
        points: 80,
        content: `
          <h2>Land Resources: Foundation of Agriculture</h2>
          <p>Land is a finite resource essential for food production, habitation, and ecosystem services.</p>

          <h3>Land Use Categories</h3>
          <ul>
            <li><strong>Agricultural Land:</strong> Crop production and livestock</li>
            <li><strong>Forest Land:</strong> Timber production and biodiversity</li>
            <li><strong>Urban Land:</strong> Cities and infrastructure</li>
            <li><strong>Unused Land:</strong> Deserts, mountains, wetlands</li>
          </ul>

          <h3>Land Degradation</h3>
          <p>Soil erosion, desertification, and urbanization reduce land productivity. Sustainable land management practices are essential for conservation.</p>
        `
      },
      {
        title: "Role of Individual in Conservation",
        duration: "13 minutes",
        points: 80,
        content: `
          <h2>Individual Action for Resource Conservation</h2>
          <p>Individual choices and actions collectively create significant environmental impact.</p>

          <h3>Personal Conservation Actions</h3>
          <ul>
            <li><strong>Reduce Consumption:</strong> Minimize waste and unnecessary purchases</li>
            <li><strong>Conserve Energy:</strong> Use energy-efficient appliances and practices</li>
            <li><strong>Water Conservation:</strong> Reduce water usage and fix leaks</li>
            <li><strong>Sustainable Choices:</strong> Choose eco-friendly products and services</li>
          </ul>

          <h3>Community Engagement</h3>
          <p>Individual actions amplify when combined with community involvement, advocacy, and education.</p>
        `
      },
      {
        title: "Sustainable Life Styles",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Sustainable Lifestyles: Living in Harmony</h2>
          <p>Sustainable living balances human needs with environmental protection and social equity.</p>

          <h3>Principles of Sustainable Living</h3>
          <ul>
            <li><strong>Reduce Impact:</strong> Minimize environmental footprint</li>
            <li><strong>Reuse Resources:</strong> Extend product lifecycles</li>
            <li><strong>Recycle Materials:</strong> Return resources to productive use</li>
            <li><strong>Renewable Energy:</strong> Transition to clean energy sources</li>
          </ul>

          <h3>Benefits of Sustainable Living</h3>
          <p>Sustainable lifestyles reduce environmental impact, lower living costs, and contribute to community well-being and global sustainability.</p>
        `
      }
    ]
  },
  {
    title: "ECOSYSTEMS",
    description: "Understanding ecosystems, their structure, functions, and ecological processes",
    lessons: [
      {
        title: "Concept of Ecosystem",
        duration: "14 minutes",
        points: 80,
        content: `
          <h2>The Concept of Ecosystem</h2>
          <p>An ecosystem is a dynamic complex of plant, animal, and microorganism communities and their non-living environment, interacting as a functional unit.</p>

          <h3>Ecosystem Components</h3>
          <ul>
            <li><strong>Abiotic Components:</strong> Physical and chemical factors (soil, water, air, sunlight)</li>
            <li><strong>Biotic Components:</strong> Living organisms (producers, consumers, decomposers)</li>
            <li><strong>Energy Flow:</strong> Movement of energy through the system</li>
            <li><strong>Nutrient Cycling:</strong> Recycling of essential elements</li>
          </ul>

          <h3>Ecosystem Properties</h3>
          <p>Ecosystems are open systems that exchange energy and matter with their surroundings. They maintain homeostasis through complex feedback mechanisms.</p>
        `
      },
      {
        title: "Structure and Functions",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Ecosystem Structure and Functions</h2>
          <p>Ecosystems have both structural and functional attributes that determine their health and productivity.</p>

          <h3>Structural Components</h3>
          <ul>
            <li><strong>Species Composition:</strong> Diversity and abundance of organisms</li>
            <li><strong>Stratification:</strong> Vertical arrangement of organisms</li>
            <li><strong>Trophic Structure:</strong> Feeding relationships and energy flow</li>
          </ul>

          <h3>Functional Processes</h3>
          <p>Ecosystem functions include primary production, nutrient cycling, decomposition, and regulation of environmental conditions.</p>
        `
      },
      {
        title: "Producers, Consumers, Decomposers",
        duration: "15 minutes",
        points: 80,
        content: `
          <h2>Ecosystem Organisms: Producers, Consumers, Decomposers</h2>
          <p>Organisms in ecosystems are classified based on their role in energy flow and nutrient cycling.</p>

          <h3>Producers (Autotrophs)</h3>
          <ul>
            <li><strong>Plants:</strong> Convert solar energy to chemical energy through photosynthesis</li>
            <li><strong>Algae:</strong> Aquatic primary producers</li>
            <li><strong>Cyanobacteria:</strong> Photosynthetic bacteria</li>
          </ul>

          <h3>Consumers (Heterotrophs)</h3>
          <ul>
            <li><strong>Primary Consumers:</strong> Herbivores that eat producers</li>
            <li><strong>Secondary Consumers:</strong> Carnivores that eat herbivores</li>
            <li><strong>Tertiary Consumers:</strong> Top predators</li>
          </ul>

          <h3>Decomposers</h3>
          <p>Bacteria and fungi that break down dead organic matter, releasing nutrients back into the ecosystem.</p>
        `
      },
      {
        title: "Energy Flow",
        duration: "17 minutes",
        points: 85,
        content: `
          <h2>Energy Flow in Ecosystems</h2>
          <p>Energy flows through ecosystems in one direction, from producers to consumers to decomposers.</p>

          <h3>Energy Transfer Principles</h3>
          <ul>
            <li><strong>10% Rule:</strong> Only 10% of energy transfers to the next trophic level</li>
            <li><strong>Energy Loss:</strong> Most energy is lost as heat during metabolic processes</li>
            <li><strong>Pyramid of Energy:</strong> Shows energy availability at each trophic level</li>
          </ul>

          <h3>Energy Pathways</h3>
          <p>Energy flows through food chains and food webs, supporting ecosystem productivity and biodiversity.</p>
        `
      },
      {
        title: "Food Chains & Webs",
        duration: "14 minutes",
        points: 80,
        content: `
          <h2>Food Chains and Food Webs</h2>
          <p>Food chains and webs illustrate the feeding relationships and energy flow in ecosystems.</p>

          <h3>Food Chains</h3>
          <p>Linear sequences showing energy transfer: Producer → Primary Consumer → Secondary Consumer → Tertiary Consumer</p>

          <h3>Food Webs</h3>
          <p>Complex networks of interconnected food chains showing realistic feeding relationships in ecosystems.</p>

          <h3>Importance</h3>
          <p>Food webs demonstrate ecosystem complexity and resilience, showing how changes in one species can affect the entire system.</p>
        `
      },
      {
        title: "Ecological Pyramids",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Ecological Pyramids</h2>
          <p>Ecological pyramids graphically represent the relationship between different trophic levels in an ecosystem.</p>

          <h3>Types of Pyramids</h3>
          <ul>
            <li><strong>Pyramid of Numbers:</strong> Number of organisms at each trophic level</li>
            <li><strong>Pyramid of Biomass:</strong> Total biomass at each trophic level</li>
            <li><strong>Pyramid of Energy:</strong> Energy content at each trophic level</li>
          </ul>

          <h3>Pyramid Shapes</h3>
          <p>Most ecosystems show upright pyramids, but some aquatic ecosystems have inverted pyramids due to small producers and large consumers.</p>
        `
      },
      {
        title: "Types of Ecosystems",
        duration: "18 minutes",
        points: 85,
        content: `
          <h2>Types of Ecosystems</h2>
          <p>Ecosystems are classified based on habitat, climate, and dominant vegetation.</p>

          <h3>Terrestrial Ecosystems</h3>
          <ul>
            <li><strong>Forest Ecosystems:</strong> Tropical, temperate, boreal forests</li>
            <li><strong>Grassland Ecosystems:</strong> Prairies, savannas, steppes</li>
            <li><strong>Desert Ecosystems:</strong> Arid regions with specialized adaptations</li>
            <li><strong>Tundra Ecosystems:</strong> Cold regions with permafrost</li>
          </ul>

          <h3>Aquatic Ecosystems</h3>
          <ul>
            <li><strong>Freshwater:</strong> Rivers, lakes, ponds, wetlands</li>
            <li><strong>Marine:</strong> Oceans, coral reefs, estuaries</li>
          </ul>
        `
      },
      {
        title: "Ecological Succession",
        duration: "15 minutes",
        points: 80,
        content: `
          <h2>Ecological Succession</h2>
          <p>Ecological succession is the process of change in the species structure of an ecological community over time.</p>

          <h3>Types of Succession</h3>
          <ul>
            <li><strong>Primary Succession:</strong> Colonization of barren land</li>
            <li><strong>Secondary Succession:</strong> Recovery after disturbance</li>
          </ul>

          <h3>Successional Stages</h3>
          <ol>
            <li>Pioneer stage with hardy species</li>
            <li>Intermediate stages with increasing complexity</li>
            <li>Climax community in equilibrium</li>
          </ol>

          <h3>Importance</h3>
          <p>Succession demonstrates ecosystem resilience and the dynamic nature of ecological communities.</p>
        `
      }
    ]
  },
  {
    title: "BIODIVERSITY AND ITS CONSERVATION",
    description: "Exploring biodiversity levels, values, threats, and conservation strategies",
    lessons: [
      {
        title: "Levels of Biodiversity",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Levels of Biodiversity</h2>
          <p>Biodiversity exists at multiple hierarchical levels, from genes to ecosystems.</p>

          <h3>Genetic Diversity</h3>
          <p>Variation in genes within a species, essential for adaptation and evolution.</p>

          <h3>Species Diversity</h3>
          <p>Variety of species in a given area, including richness and evenness.</p>

          <h3>Ecosystem Diversity</h3>
          <p>Variety of ecosystems within a region, including different habitats and communities.</p>

          <h3>Importance</h3>
          <p>Each level of biodiversity contributes to ecosystem stability and human well-being.</p>
        `
      },
      {
        title: "Value of Biodiversity",
        duration: "17 minutes",
        points: 85,
        content: `
          <h2>The Value of Biodiversity</h2>
          <p>Biodiversity provides essential services and benefits to humanity and ecosystems.</p>

          <h3>Ecosystem Services</h3>
          <ul>
            <li><strong>Provisioning Services:</strong> Food, water, materials</li>
            <li><strong>Regulating Services:</strong> Climate regulation, water purification</li>
            <li><strong>Cultural Services:</strong> Recreation, spiritual values</li>
            <li><strong>Supporting Services:</strong> Nutrient cycling, soil formation</li>
          </ul>

          <h3>Economic Value</h3>
          <p>Biodiversity contributes trillions of dollars annually to the global economy through various services and products.</p>
        `
      },
      {
        title: "Threats",
        duration: "15 minutes",
        points: 80,
        content: `
          <h2>Threats to Biodiversity</h2>
          <p>Human activities are causing unprecedented rates of species extinction and habitat loss.</p>

          <h3>Major Threats</h3>
          <ul>
            <li><strong>Habitat Destruction:</strong> Deforestation, urbanization, agriculture</li>
            <li><strong>Climate Change:</strong> Altered temperature and precipitation patterns</li>
            <li><strong>Pollution:</strong> Chemical contamination of air, water, and soil</li>
            <li><strong>Overexploitation:</strong> Unsustainable hunting, fishing, and harvesting</li>
            <li><strong>Invasive Species:</strong> Introduction of non-native species</li>
          </ul>

          <h3>Extinction Rates</h3>
          <p>Current extinction rates are 100-1000 times higher than natural background rates.</p>
        `
      },
      {
        title: "Endangered Species",
        duration: "14 minutes",
        points: 80,
        content: `
          <h2>Endangered Species and Conservation</h2>
          <p>Many species are at risk of extinction due to human activities and environmental changes.</p>

          <h3>Categories of Threat</h3>
          <ul>
            <li><strong>Critically Endangered:</strong> Extremely high risk of extinction</li>
            <li><strong>Endangered:</strong> Very high risk of extinction</li>
            <li><strong>Vulnerable:</strong> High risk of extinction</li>
            <li><strong>Near Threatened:</strong> Close to qualifying for threatened category</li>
          </ul>

          <h3>Conservation Strategies</h3>
          <p>Protected areas, captive breeding, habitat restoration, and anti-poaching measures help protect endangered species.</p>
        `
      },
      {
        title: "Conservation Methods",
        duration: "18 minutes",
        points: 85,
        content: `
          <h2>Biodiversity Conservation Methods</h2>
          <p>Effective conservation requires a combination of strategies at different levels.</p>

          <h3>In Situ Conservation</h3>
          <ul>
            <li><strong>Protected Areas:</strong> National parks, wildlife sanctuaries</li>
            <li><strong>Habitat Corridors:</strong> Connecting fragmented habitats</li>
            <li><strong>Community Reserves:</strong> Locally managed protected areas</li>
          </ul>

          <h3>Ex Situ Conservation</h3>
          <ul>
            <li><strong>Botanical Gardens:</strong> Plant conservation</li>
            <li><strong>Zoos and Aquariums:</strong> Animal breeding programs</li>
            <li><strong>Seed Banks:</strong> Long-term seed storage</li>
          </ul>
        `
      },
      {
        title: "India Biodiversity Hotspots",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>India's Biodiversity Hotspots</h2>
          <p>India is one of the world's megadiverse countries with exceptional biodiversity.</p>

          <h3>Major Hotspots</h3>
          <ul>
            <li><strong>Western Ghats:</strong> One of the world's eight hottest biodiversity hotspots</li>
            <li><strong>Himalayas:</strong> Rich in endemic species and high-altitude ecosystems</li>
            <li><strong>Indo-Burma Region:</strong> Includes Northeast India with exceptional diversity</li>
          </ul>

          <h3>Endemic Species</h3>
          <p>India has over 45,000 plant species and 91,000 animal species, with high levels of endemism.</p>
        `
      },
      {
        title: "Conservation Efforts",
        duration: "15 minutes",
        points: 80,
        content: `
          <h2>Conservation Efforts in India</h2>
          <p>India has implemented comprehensive conservation programs and policies.</p>

          <h3>Key Initiatives</h3>
          <ul>
            <li><strong>Project Tiger:</strong> Protection of tiger populations and habitats</li>
            <li><strong>Project Elephant:</strong> Conservation of Asian elephants</li>
            <li><strong>National Biodiversity Action Plan:</strong> Comprehensive conservation strategy</li>
            <li><strong>Joint Forest Management:</strong> Community participation in forest conservation</li>
          </ul>

          <h3>Legal Framework</h3>
          <p>The Wildlife Protection Act, Forest Conservation Act, and Biodiversity Act provide legal protection for India's biodiversity.</p>
        `
      }
    ]
  },
  {
    title: "ENVIRONMENTAL POLLUTION",
    description: "Comprehensive study of various types of environmental pollution and management strategies",
    lessons: [
      {
        title: "Introduction",
        duration: "14 minutes",
        points: 80,
        content: `
          <h2>Introduction to Environmental Pollution</h2>
          <p>Environmental pollution is the contamination of the natural environment with harmful substances.</p>

          <h3>Definition and Scope</h3>
          <p>Pollution occurs when pollutants are introduced into the environment at rates faster than natural processes can remove or neutralize them.</p>

          <h3>Types of Pollution</h3>
          <ul>
            <li><strong>Air Pollution:</strong> Contamination of the atmosphere</li>
            <li><strong>Water Pollution:</strong> Contamination of water bodies</li>
            <li><strong>Soil Pollution:</strong> Contamination of land and soil</li>
            <li><strong>Noise Pollution:</strong> Excessive noise affecting health</li>
            <li><strong>Thermal Pollution:</strong> Temperature changes in water bodies</li>
          </ul>
        `
      },
      {
        title: "Air Pollution",
        duration: "17 minutes",
        points: 85,
        content: `
          <h2>Air Pollution: The Invisible Threat</h2>
          <p>Air pollution is the presence of harmful substances in the atmosphere that affect human health and the environment.</p>

          <h3>Major Pollutants</h3>
          <ul>
            <li><strong>Particulate Matter (PM):</strong> Tiny particles suspended in air</li>
            <li><strong>Nitrogen Oxides (NOx):</strong> From vehicle emissions and industry</li>
            <li><strong>Sulfur Dioxide (SO2):</strong> From fossil fuel combustion</li>
            <li><strong>Carbon Monoxide (CO):</strong> Poisonous gas from incomplete combustion</li>
            <li><strong>Volatile Organic Compounds (VOCs):</strong> From solvents and paints</li>
          </ul>

          <h3>Health Impacts</h3>
          <p>Air pollution causes respiratory diseases, cardiovascular problems, and premature death.</p>
        `
      },
      {
        title: "Water Pollution",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Water Pollution: Contaminating Life's Essence</h2>
          <p>Water pollution is the contamination of water bodies with harmful substances that affect aquatic life and human health.</p>

          <h3>Sources of Water Pollution</h3>
          <ul>
            <li><strong>Industrial Waste:</strong> Chemical discharges from factories</li>
            <li><strong>Sewage:</strong> Untreated wastewater from households</li>
            <li><strong>Agricultural Runoff:</strong> Pesticides and fertilizers</li>
            <li><strong>Oil Spills:</strong> Petroleum products contaminating oceans</li>
            <li><strong>Plastic Waste:</strong> Microplastics and debris</li>
          </ul>

          <h3>Effects</h3>
          <p>Water pollution kills aquatic organisms, spreads diseases, and contaminates drinking water supplies.</p>
        `
      },
      {
        title: "Soil Pollution",
        duration: "15 minutes",
        points: 80,
        content: `
          <h2>Soil Pollution: Degrading the Foundation</h2>
          <p>Soil pollution is the contamination of soil with harmful substances that affect plant growth and human health.</p>

          <h3>Causes of Soil Pollution</h3>
          <ul>
            <li><strong>Industrial Waste:</strong> Heavy metals and toxic chemicals</li>
            <li><strong>Pesticides and Fertilizers:</strong> Agricultural chemicals</li>
            <li><strong>Plastic Waste:</strong> Non-biodegradable materials</li>
            <li><strong>Mining Activities:</strong> Overburden and tailings</li>
          </ul>

          <h3>Consequences</h3>
          <p>Soil pollution reduces agricultural productivity, contaminates food chains, and affects soil biodiversity.</p>
        `
      },
      {
        title: "Marine Pollution",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Marine Pollution: Oceans in Peril</h2>
          <p>Marine pollution threatens ocean ecosystems and the services they provide to humanity.</p>

          <h3>Major Threats</h3>
          <ul>
            <li><strong>Oil Spills:</strong> Devastating effects on marine life</li>
            <li><strong>Plastic Pollution:</strong> Ghost fishing gear and microplastics</li>
            <li><strong>Nutrient Pollution:</strong> Eutrophication and dead zones</li>
            <li><strong>Heavy Metals:</strong> Toxic accumulation in food chains</li>
          </ul>

          <h3>Global Impact</h3>
          <p>Marine pollution affects fisheries, tourism, and coastal communities worldwide.</p>
        `
      },
      {
        title: "Noise & Thermal Pollution",
        duration: "14 minutes",
        points: 80,
        content: `
          <h2>Noise and Thermal Pollution</h2>
          <p>These less visible forms of pollution have significant impacts on ecosystems and human health.</p>

          <h3>Noise Pollution</h3>
          <ul>
            <li><strong>Sources:</strong> Traffic, industry, construction</li>
            <li><strong>Effects:</strong> Hearing loss, stress, wildlife disruption</li>
          </ul>

          <h3>Thermal Pollution</h3>
          <ul>
            <li><strong>Sources:</strong> Power plant cooling water, deforestation</li>
            <li><strong>Effects:</strong> Reduced dissolved oxygen, altered ecosystems</li>
          </ul>
        `
      },
      {
        title: "Nuclear Hazards",
        duration: "17 minutes",
        points: 85,
        content: `
          <h2>Nuclear Hazards and Radiation</h2>
          <p>Nuclear activities can release radioactive materials that pose long-term health and environmental risks.</p>

          <h3>Types of Nuclear Hazards</h3>
          <ul>
            <li><strong>Nuclear Accidents:</strong> Chernobyl, Fukushima incidents</li>
            <li><strong>Nuclear Waste:</strong> Long-lived radioactive materials</li>
            <li><strong>Nuclear Testing:</strong> Atmospheric and underground tests</li>
          </ul>

          <h3>Radiation Effects</h3>
          <p>Ionizing radiation can cause genetic mutations, cancer, and environmental contamination for centuries.</p>
        `
      },
      {
        title: "Waste Management",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Waste Management: Reducing Pollution at Source</h2>
          <p>Effective waste management prevents pollution and conserves resources.</p>

          <h3>Waste Hierarchy</h3>
          <ol>
            <li><strong>Prevention:</strong> Reduce waste generation</li>
            <li><strong>Reuse:</strong> Extend product lifecycles</li>
            <li><strong>Recycle:</strong> Convert waste to new products</li>
            <li><strong>Recovery:</strong> Extract energy from waste</li>
            <li><strong>Disposal:</strong> Safe landfill or incineration</li>
          </ol>

          <h3>Modern Approaches</h3>
          <p>Circular economy principles and zero-waste strategies minimize environmental impact.</p>
        `
      },
      {
        title: "Prevention",
        duration: "15 minutes",
        points: 80,
        content: `
          <h2>Pollution Prevention Strategies</h2>
          <p>Prevention is more effective and cost-efficient than pollution cleanup.</p>

          <h3>Prevention Principles</h3>
          <ul>
            <li><strong>Clean Production:</strong> Pollution prevention at source</li>
            <li><strong>Green Chemistry:</strong> Environmentally friendly chemical processes</li>
            <li><strong>Sustainable Design:</strong> Products designed for minimal environmental impact</li>
            <li><strong>Regulatory Frameworks:</strong> Laws and standards for pollution control</li>
          </ul>

          <h3>Technological Solutions</h3>
          <p>Advanced treatment technologies, monitoring systems, and sustainable practices reduce pollution effectively.</p>
        `
      },
      {
        title: "Case Studies",
        duration: "18 minutes",
        points: 85,
        content: `
          <h2>Pollution Case Studies</h2>
          <p>Real-world examples illustrate the causes, impacts, and solutions to pollution problems.</p>

          <h3>Famous Cases</h3>
          <ul>
            <li><strong>Cuyahoga River Fire:</strong> Industrial pollution leading to environmental legislation</li>
            <li><strong>Love Canal:</strong> Toxic waste contamination of residential area</li>
            <li><strong>Chernobyl Disaster:</strong> Nuclear accident with global consequences</li>
            <li><strong>Minamata Disease:</strong> Mercury poisoning from industrial waste</li>
          </ul>

          <h3>Lessons Learned</h3>
          <p>These cases demonstrate the importance of environmental regulations, monitoring, and community involvement in pollution prevention.</p>
        `
      },
      {
        title: "Disaster Management",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Environmental Disaster Management</h2>
          <p>Effective disaster management minimizes the impacts of pollution incidents and environmental emergencies.</p>

          <h3>Disaster Response</h3>
          <ul>
            <li><strong>Risk Assessment:</strong> Identify potential pollution sources</li>
            <li><strong>Emergency Planning:</strong> Develop response strategies</li>
            <li><strong>Containment:</strong> Prevent spread of pollutants</li>
            <li><strong>Cleanup:</strong> Remove and treat contaminated materials</li>
            <li><strong>Recovery:</strong> Restore affected ecosystems</li>
          </ul>

          <h3>International Cooperation</h3>
          <p>Transboundary pollution requires international agreements and coordinated response efforts.</p>
        `
      }
    ]
  },
  {
    title: "SOCIAL ISSUES AND THE ENVIRONMENT",
    description: "Exploring social issues related to environment, sustainable development, and environmental ethics",
    lessons: [
      {
        title: "Sustainable Development",
        duration: "17 minutes",
        points: 85,
        content: `
          <h2>Sustainable Development: Meeting Present and Future Needs</h2>
          <p>Sustainable development balances economic growth, social equity, and environmental protection.</p>

          <h3>Brundtland Definition</h3>
          <p>"Development that meets the needs of the present without compromising the ability of future generations to meet their own needs."</p>

          <h3>Three Pillars</h3>
          <ul>
            <li><strong>Economic Sustainability:</strong> Long-term economic viability</li>
            <li><strong>Social Sustainability:</strong> Equity and quality of life</li>
            <li><strong>Environmental Sustainability:</strong> Ecosystem health and resource conservation</li>
          </ul>

          <h3>Global Goals</h3>
          <p>The UN Sustainable Development Goals (SDGs) provide a framework for global sustainable development efforts.</p>
        `
      },
      {
        title: "Urban Energy Problems",
        duration: "15 minutes",
        points: 80,
        content: `
          <h2>Urban Energy Challenges</h2>
          <p>Rapid urbanization creates complex energy demands and environmental challenges.</p>

          <h3>Urban Energy Issues</h3>
          <ul>
            <li><strong>High Energy Consumption:</strong> Buildings, transportation, industry</li>
            <li><strong>Air Pollution:</strong> Vehicle emissions and industrial sources</li>
            <li><strong>Heat Island Effect:</strong> Urban areas retain more heat</li>
            <li><strong>Energy Poverty:</strong> Unequal access to clean energy</li>
          </ul>

          <h3>Solutions</h3>
          <p>Renewable energy integration, energy-efficient buildings, and sustainable transportation reduce urban energy problems.</p>
        `
      },
      {
        title: "Water Conservation",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Water Conservation: Preserving a Precious Resource</h2>
          <p>Water conservation is essential for sustainable development and human survival.</p>

          <h3>Water Conservation Strategies</h3>
          <ul>
            <li><strong>Efficient Irrigation:</strong> Drip irrigation and rainwater harvesting</li>
            <li><strong>Water Reuse:</strong> Greywater systems and wastewater treatment</li>
            <li><strong>Leak Prevention:</strong> Regular maintenance and smart metering</li>
            <li><strong>Behavioral Change:</strong> Public education and awareness</li>
          </ul>

          <h3>Community Approaches</h3>
          <p>Community-based water management and traditional water conservation practices complement technological solutions.</p>
        `
      },
      {
        title: "Rainwater Harvesting",
        duration: "14 minutes",
        points: 80,
        content: `
          <h2>Rainwater Harvesting: Ancient Wisdom, Modern Application</h2>
          <p>Rainwater harvesting captures and stores rainwater for beneficial use.</p>

          <h3>Methods</h3>
          <ul>
            <li><strong>Surface Runoff Harvesting:</strong> Collection from rooftops and paved areas</li>
            <li><strong>Groundwater Recharge:</strong> Artificial recharge of aquifers</li>
            <li><strong>Traditional Systems:</strong> Tanks, ponds, and check dams</li>
          </ul>

          <h3>Benefits</h3>
          <p>Rainwater harvesting reduces flooding, replenishes groundwater, and provides water security.</p>
        `
      },
      {
        title: "Rehabilitation Issues",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Environmental Rehabilitation: Healing Damaged Ecosystems</h2>
          <p>Rehabilitation restores degraded ecosystems and improves environmental quality.</p>

          <h3>Rehabilitation Challenges</h3>
          <ul>
            <li><strong>Mining Sites:</strong> Restoring land after mineral extraction</li>
            <li><strong>Industrial Areas:</strong> Cleaning contaminated sites</li>
            <li><strong>Deforested Areas:</strong> Reforestation and afforestation</li>
            <li><strong>Wetlands:</strong> Restoring degraded wetland ecosystems</li>
          </ul>

          <h3>Approaches</h3>
          <p>Ecological restoration, phytoremediation, and community involvement are key to successful rehabilitation.</p>
        `
      },
      {
        title: "Environmental Ethics",
        duration: "17 minutes",
        points: 85,
        content: `
          <h2>Environmental Ethics: Moral Responsibility</h2>
          <p>Environmental ethics examines human moral obligations to the natural environment.</p>

          <h3>Ethical Perspectives</h3>
          <ul>
            <li><strong>Anthropocentrism:</strong> Human-centered environmental concern</li>
            <li><strong>Biocentrism:</strong> All living beings have moral standing</li>
            <li><strong>Ecocentrism:</strong> Ecosystems have intrinsic value</li>
            <li><strong>Deep Ecology:</strong> Radical environmental philosophy</li>
          </ul>

          <h3>Ethical Principles</h3>
          <p>Respect for nature, intergenerational equity, and sustainable stewardship guide environmental decision-making.</p>
        `
      },
      {
        title: "Climate Change Issues",
        duration: "18 minutes",
        points: 85,
        content: `
          <h2>Climate Change: A Social and Environmental Crisis</h2>
          <p>Climate change creates complex social, economic, and environmental challenges.</p>

          <h3>Social Impacts</h3>
          <ul>
            <li><strong>Vulnerable Communities:</strong> Disproportionate effects on poor and marginalized groups</li>
            <li><strong>Migration:</strong> Climate-induced displacement</li>
            <li><strong>Food Security:</strong> Agricultural impacts and crop failures</li>
            <li><strong>Health Risks:</strong> Heat-related illnesses and disease spread</li>
          </ul>

          <h3>Equity Issues</h3>
          <p>Developed countries have contributed most to climate change but developing countries suffer the greatest impacts.</p>
        `
      },
      {
        title: "Waste Management",
        duration: "15 minutes",
        points: 80,
        content: `
          <h2>Solid Waste Management: Social and Environmental Dimensions</h2>
          <p>Waste management involves social equity, public health, and environmental protection.</p>

          <h3>Social Aspects</h3>
          <ul>
            <li><strong>Informal Sector:</strong> Waste pickers and recycling communities</li>
            <li><strong>Public Health:</strong> Disease vectors and contamination</li>
            <li><strong>Equity:</strong> Access to waste collection services</li>
          </ul>

          <h3>Community Solutions</h3>
          <p>Community-based waste management and circular economy approaches create social and environmental benefits.</p>
        `
      },
      {
        title: "Wildlife Protection Laws",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Wildlife Protection: Legal Frameworks</h2>
          <p>Wildlife protection laws balance conservation with human development needs.</p>

          <h3>International Agreements</h3>
          <ul>
            <li><strong>CITES:</strong> Convention on International Trade in Endangered Species</li>
            <li><strong>CBD:</strong> Convention on Biological Diversity</li>
            <li><strong>Ramsar Convention:</strong> Wetland conservation</li>
          </ul>

          <h3>National Legislation</h3>
          <p>Countries have comprehensive wildlife protection acts, endangered species lists, and protected area networks.</p>
        `
      },
      {
        title: "Environmental Legislation",
        duration: "17 minutes",
        points: 85,
        content: `
          <h2>Environmental Legislation: Frameworks for Protection</h2>
          <p>Environmental laws provide the legal basis for pollution control and resource management.</p>

          <h3>Key Legislation Types</h3>
          <ul>
            <li><strong>Air Quality Laws:</strong> Clean Air Act, emission standards</li>
            <li><strong>Water Quality Laws:</strong> Clean Water Act, discharge permits</li>
            <li><strong>Waste Management Laws:</strong> Hazardous waste regulations</li>
            <li><strong>Environmental Impact Assessment:</strong> Project evaluation requirements</li>
          </ul>

          <h3>Enforcement Challenges</h3>
          <p>Effective implementation requires monitoring, compliance, and public participation.</p>
        `
      }
    ]
  },
  {
    title: "HUMAN POPULATION AND ENVIRONMENT",
    description: "Understanding human population dynamics and their impact on the environment",
    lessons: [
      {
        title: "Population Growth",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Human Population Growth: Trends and Implications</h2>
          <p>Human population has grown exponentially, creating unprecedented environmental pressures.</p>

          <h3>Population Milestones</h3>
          <ul>
            <li><strong>1 Billion (1804):</strong> Took thousands of years</li>
            <li><strong>2 Billion (1927):</strong> 123 years</li>
            <li><strong>3 Billion (1960):</strong> 33 years</li>
            <li><strong>8 Billion (2023):</strong> Expected soon</li>
          </ul>

          <h3>Growth Patterns</h3>
          <p>Population growth rates vary by region, with highest growth in developing countries.</p>
        `
      },
      {
        title: "Population Explosion",
        duration: "15 minutes",
        points: 80,
        content: `
          <h2>Population Explosion: Causes and Consequences</h2>
          <p>Rapid population growth creates complex social, economic, and environmental challenges.</p>

          <h3>Causes</h3>
          <ul>
            <li><strong>Medical Advances:</strong> Reduced mortality rates</li>
            <li><strong>Improved Nutrition:</strong> Better food security</li>
            <li><strong>Cultural Factors:</strong> Preference for larger families</li>
            <li><strong>Economic Factors:</strong> Children as economic assets</li>
          </ul>

          <h3>Consequences</h3>
          <p>Population pressure strains resources, increases pollution, and accelerates environmental degradation.</p>
        `
      },
      {
        title: "Human Health",
        duration: "17 minutes",
        points: 85,
        content: `
          <h2>Population and Human Health</h2>
          <p>Population dynamics significantly influence public health outcomes and healthcare systems.</p>

          <h3>Health Challenges</h3>
          <ul>
            <li><strong>Urban Health Issues:</strong> Pollution, overcrowding, stress</li>
            <li><strong>Infectious Diseases:</strong> Higher transmission in dense populations</li>
            <li><strong>Mental Health:</strong> Social isolation and psychological stress</li>
            <li><strong>Healthcare Access:</strong> Strain on medical systems</li>
          </ul>

          <h3>Environmental Health Links</h3>
          <p>Population growth exacerbates environmental health risks including pollution, climate change, and resource scarcity.</p>
        `
      },
      {
        title: "Human Rights",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Population, Environment, and Human Rights</h2>
          <p>Population dynamics intersect with human rights in complex ways.</p>

          <h3>Rights Considerations</h3>
          <ul>
            <li><strong>Reproductive Rights:</strong> Access to family planning</li>
            <li><strong>Right to Clean Environment:</strong> Environmental justice</li>
            <li><strong>Right to Resources:</strong> Equitable resource distribution</li>
            <li><strong>Indigenous Rights:</strong> Protection of traditional lands</li>
          </ul>

          <h3>Equity Issues</h3>
          <p>Population policies must respect human rights while addressing environmental sustainability.</p>
        `
      },
      {
        title: "Value Education",
        duration: "14 minutes",
        points: 80,
        content: `
          <h2>Value Education for Population Management</h2>
          <p>Value education promotes responsible attitudes toward population and environment.</p>

          <h3>Key Values</h3>
          <ul>
            <li><strong>Environmental Responsibility:</strong> Stewardship of natural resources</li>
            <li><strong>Social Responsibility:</strong> Community and intergenerational equity</li>
            <li><strong>Personal Responsibility:</strong> Individual choices and lifestyles</li>
          </ul>

          <h3>Educational Approaches</h3>
          <p>Integrating environmental and population education into school curricula fosters sustainable values.</p>
        `
      },
      {
        title: "HIV/AIDS",
        duration: "15 minutes",
        points: 80,
        content: `
          <h2>HIV/AIDS and Population Dynamics</h2>
          <p>HIV/AIDS has significant impacts on population structure and community health.</p>

          <h3>Demographic Impacts</h3>
          <ul>
            <li><strong>Mortality Rates:</strong> Increased death rates in affected populations</li>
            <li><strong>Life Expectancy:</strong> Reduced average lifespan</li>
            <li><strong>Orphan Populations:</strong> Children losing parents</li>
          </ul>

          <h3>Social Consequences</h3>
          <p>HIV/AIDS affects family structures, economic productivity, and healthcare systems.</p>
        `
      },
      {
        title: "Women & Child Welfare",
        duration: "16 minutes",
        points: 85,
        content: `
          <h2>Women and Child Welfare in Population Context</h2>
          <p>Population policies and women's empowerment are closely linked.</p>

          <h3>Women's Role</h3>
          <ul>
            <li><strong>Education:</strong> Educated women have fewer children</li>
            <li><strong>Empowerment:</strong> Economic independence and decision-making</li>
            <li><strong>Health Care:</strong> Access to reproductive health services</li>
          </ul>

          <h3>Child Welfare</h3>
          <p>Population stabilization improves child health, education, and development outcomes.</p>
        `
      },
      {
        title: "Role of IT",
        duration: "14 minutes",
        points: 80,
        content: `
          <h2>Information Technology in Population Management</h2>
          <p>IT tools enhance population data collection, analysis, and policy implementation.</p>

          <h3>IT Applications</h3>
          <ul>
            <li><strong>Data Analytics:</strong> Population trend analysis</li>
            <li><strong>Health Information Systems:</strong> Reproductive health tracking</li>
            <li><strong>Educational Platforms:</strong> Online learning and awareness</li>
            <li><strong>Mobile Applications:</strong> Family planning and health services</li>
          </ul>

          <h3>Digital Divide</h3>
          <p>Ensuring equitable access to IT tools is essential for effective population management.</p>
        `
      }
    ]
  }
];

async function updateEnvironmentalModules() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecoverse';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    let updated = 0;

    for (const moduleData of environmentalModulesContent) {
      const existingModule = await LearningModule.findOne({
        title: { $regex: new RegExp(`^${moduleData.title}$`, 'i') }
      });

      if (existingModule) {
        const lessons = moduleData.lessons.map((lesson, index) => ({
          id: (index + 1).toString(),
          title: lesson.title,
          duration: lesson.duration,
          content: lesson.content,
          points: lesson.points,
          order: index,
          quiz: {
            questions: []
          }
        }));

        await LearningModule.updateOne(
          { _id: existingModule._id },
          {
            $set: {
              description: moduleData.description,
              lessons: lessons
            }
          }
        );
        updated++;
        console.log(`Updated module: ${moduleData.title}`);
      }
    }

    console.log(`Updated ${updated} modules with detailed content`);
  } catch (error) {
    console.error('Error updating modules:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateEnvironmentalModules();