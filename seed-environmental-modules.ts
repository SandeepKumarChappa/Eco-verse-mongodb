import 'dotenv/config';
import mongoose from 'mongoose';
import { LearningModule } from './server/models/LearningModule';

const environmentalModules = [
  {
    title: "MULTIDISCIPLINARY NATURE OF ENVIRONMENTAL STUDIES",
    description: "Understanding the multidisciplinary nature of environmental studies and the need for public awareness",
    lessons: [
      { title: "Definition", points: 5 },
      { title: "Scope", points: 5 },
      { title: "Importance", points: 5 },
      { title: "Need for Public Awareness", points: 5 }
    ],
    link: "https://environmutli.netlify.app/"
  },
  {
    title: "NATURAL RESOURCES: RENEWABLE AND NON-RENEWABLE RESOURCES",
    description: "Comprehensive study of natural resources, their problems, and conservation strategies",
    lessons: [
      { title: "Natural resources and Associated problems", points: 5 },
      { title: "Forest Resources", points: 5 },
      { title: "Water Resources", points: 5 },
      { title: "Mineral Resources", points: 5 },
      { title: "Food Resources", points: 5 },
      { title: "Energy Resources", points: 5 },
      { title: "Land Resources", points: 5 },
      { title: "Role of Individual in Conservation", points: 5 },
      { title: "Sustainable Life Styles", points: 5 }
    ],
    link: "https://naturalresources2.netlify.app/"
  },
  {
    title: "ECOSYSTEMS",
    description: "Understanding ecosystems, their structure, functions, and ecological processes",
    lessons: [
      { title: "Concept of Ecosystem", points: 5 },
      { title: "Structure and Functions", points: 5 },
      { title: "Producers, Consumers, Decomposers", points: 5 },
      { title: "Energy Flow", points: 5 },
      { title: "Food Chains & Webs", points: 5 },
      { title: "Ecological Pyramids", points: 5 },
      { title: "Types of Ecosystems", points: 5 },
      { title: "Ecological Succession", points: 5 }
    ],
    link: "https://ecosystem4.netlify.app/"
  },
  {
    title: "BIODIVERSITY AND ITS CONSERVATION",
    description: "Exploring biodiversity levels, values, threats, and conservation strategies",
    lessons: [
      { title: "Levels of Biodiversity", points: 5 },
      { title: "Value of Biodiversity", points: 5 },
      { title: "Threats", points: 5 },
      { title: "Endangered Species", points: 5 },
      { title: "Conservation Methods", points: 5 },
      { title: "India Biodiversity Hotspots", points: 5 },
      { title: "Conservation Efforts", points: 5 }
    ],
    link: "https://biosphere6.netlify.app/"
  },
  {
    title: "ENVIRONMENTAL POLLUTION",
    description: "Comprehensive study of various types of environmental pollution and management strategies",
    lessons: [
      { title: "Introduction", points: 5 },
      { title: "Air Pollution", points: 5 },
      { title: "Water Pollution", points: 5 },
      { title: "Soil Pollution", points: 5 },
      { title: "Marine Pollution", points: 5 },
      { title: "Noise & Thermal Pollution", points: 5 },
      { title: "Nuclear Hazards", points: 5 },
      { title: "Waste Management", points: 5 },
      { title: "Prevention", points: 5 },
      { title: "Case Studies", points: 5 },
      { title: "Disaster Management", points: 5 }
    ],
    link: "https://environpollut7.netlify.app/"
  },
  {
    title: "SOCIAL ISSUES AND THE ENVIRONMENT",
    description: "Exploring social issues related to environment, sustainable development, and environmental ethics",
    lessons: [
      { title: "Sustainable Development", points: 5 },
      { title: "Urban Energy Problems", points: 5 },
      { title: "Water Conservation", points: 5 },
      { title: "Rainwater Harvesting", points: 5 },
      { title: "Rehabilitation Issues", points: 5 },
      { title: "Environmental Ethics", points: 5 },
      { title: "Climate Change Issues", points: 5 },
      { title: "Waste Management", points: 5 },
      { title: "Wildlife Protection Laws", points: 5 },
      { title: "Environmental Legislation", points: 5 }
    ],
    link: "https://indianenviron.netlify.app/"
  },
  {
    title: "HUMAN POPULATION AND ENVIRONMENT",
    description: "Understanding human population dynamics and their impact on the environment",
    lessons: [
      { title: "Population Growth", points: 5 },
      { title: "Population Explosion", points: 5 },
      { title: "Human Health", points: 5 },
      { title: "Human Rights", points: 5 },
      { title: "Value Education", points: 5 },
      { title: "HIV/AIDS", points: 5 },
      { title: "Women & Child Welfare", points: 5 },
      { title: "Role of IT", points: 5 }
    ],
    link: "https://humanandenviron.netlify.app/"
  }
];

async function seedEnvironmentalModules() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecoverse';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    let created = 0;
    let updated = 0;

    for (const moduleData of environmentalModules) {
      // Check if module exists (case-insensitive title match)
      const existingModule = await LearningModule.findOne({
        title: { $regex: new RegExp(`^${moduleData.title}$`, 'i') }
      });

      // Prepare lessons with proper structure
      const lessons = moduleData.lessons.map((lesson, index) => ({
        id: (index + 1).toString(),
        title: lesson.title,
        duration: '10 minutes',
        content: `<h2>${lesson.title}</h2><p>Content for ${lesson.title} will be available at: <a href="${moduleData.link}" target="_blank">${moduleData.link}</a></p>`,
        points: lesson.points,
        order: index,
        quiz: {
          questions: [] // Empty quiz for now
        }
      }));

      if (existingModule) {
        // Update existing module
        await LearningModule.updateOne(
          { _id: existingModule._id },
          {
            $set: {
              description: moduleData.description,
              lessons: lessons,
              // Keep existing createdAt and other fields
            }
          }
        );
        console.log(`Updated module: ${moduleData.title}`);
        updated++;
      } else {
        // Create new module
        const newModule = new LearningModule({
          id: moduleData.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
          title: moduleData.title,
          description: moduleData.description,
          lessons: lessons,
          createdAt: Date.now(),
          createdByUserId: 'system',
          visibility: 'global'
        });

        await newModule.save();
        console.log(`Created module: ${moduleData.title}`);
        created++;
      }
    }

    console.log(`\nSeeding complete:`);
    console.log(`- Created: ${created} modules`);
    console.log(`- Updated: ${updated} modules`);
    console.log(`- Total processed: ${created + updated} modules`);

  } catch (error) {
    console.error('Error seeding environmental modules:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeder
seedEnvironmentalModules();