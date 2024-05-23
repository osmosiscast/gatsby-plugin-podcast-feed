const fs = require('fs-extra');
const path = require('path');
const RSS = require('rss');

const wrapper = promise =>
  promise.then(result => {
    if (result.errors) {
      throw result.errors;
    }
    return result;
  });

exports.onPostBuild = async ({ graphql }, pluginOptions) => {
  const result = await wrapper(
    graphql(`
      {
        allMarkdownRemark(
			sort: { fields: [frontmatter___date], order: DESC },
			filter: { frontmatter: { template: { eq: "post" }, draft: { ne: true } } }
		) {
          edges {
            node {
              excerpt
              html
              id
              frontmatter {
                title
                tags
                url
                number
                date
				size
				duration
				season
              }
            }
          }
        }
      }
    `)
  );

  const { feedOptions } = pluginOptions || {};

  const episodes = result.data.allMarkdownRemark.edges;

  const feed = new RSS(feedOptions);

  episodes.forEach(edge => {
    const { html, excerpt, id } = edge.node;
    const { title, number, date, url, tags, size, duration, season } = edge.node.frontmatter;

    feed.item({
      guid: id,
      title,
      url,
      description: excerpt,
      categories: tags,
      author: feedOptions.managingEditor,
      date,
      custom_elements: [
        { 'content:encoded': html },
        { pubDate: date },
        { 'itunes:explicit': 'no' },
        { 'itunes:episodeType': 'full' },
        { 'itunes:title': title },
        { 'itunes:season': season },
        { 'itunes:episode': number },
        { 'itunes:duration': duration },
        { 'itunes:summary': excerpt },
        { 'itunes:author': feedOptions.managingEditor },
        {
          'itunes:image': {
            _attr: {
              href: feedOptions.image_url,
            },
          },
        },
      ],
	  enclosure: {
        url,
        size,
        type: 'audio/mpeg'
      },
    });
  });

  const publicPath = `./public`;
  const outputPath = path.join(publicPath, '/rss.xml');
  const outputDir = path.dirname(outputPath);
  if (!(await fs.exists(outputDir))) {
    await fs.mkdirp(outputDir);
  }
  await fs.writeFile(outputPath, feed.xml());
};
