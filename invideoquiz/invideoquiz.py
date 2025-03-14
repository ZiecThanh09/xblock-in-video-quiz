"""
This XBlock allows for edX components to be displayed to users inside of
videos at specific time points.
"""

import json
import os

from xblock.core import XBlock
from xblock.fields import Scope
from xblock.fields import String
from xblock.validation import ValidationMessage
from xblock.fields import Integer

try:
    from web_fragments.fragment import Fragment
except ImportError:
    # For backward compatibility with quince and earlier.
    from xblock.fragment import Fragment

try:
    from xblock.utils.studio_editable import StudioEditableXBlockMixin
    from xblock.utils.resources import ResourceLoader
except ModuleNotFoundError:
    # For backward compatibility with releases older than Quince.
    from xblockutils.studio_editable import StudioEditableXBlockMixin
    from xblockutils.resources import ResourceLoader


from .utils import _

resource_loader = ResourceLoader(__name__)


def get_resource_string(path):
    """
    Retrieve string contents for the file path
    """
    path = os.path.join('public', path)
    return resource_loader.load_unicode(path)


class InVideoQuizXBlock(StudioEditableXBlockMixin, XBlock):
    """
    Display CAPA problems within a video component at a specified time.
    """

    show_in_read_only_mode = True

    display_name = String(
        display_name=_('Display Name'),
        default=_('In-Video Quiz XBlock'),
        scope=Scope.settings,
    )

    video_id = String(
        display_name=_('Video Location'),
        default='',
        scope=Scope.settings,
        help=_(
            'This is the component ID for the video in which '
            'you want to insert your quiz questions. It can be '
            'obtained from staff debug info of the video in the LMS.'
        ),
    )

    timemap = String(
        display_name=_('Problem Timemap'),
        default='{}',
        scope=Scope.settings,
        help=_(
            'A simple string field to define problem IDs '
            'and their time maps (in seconds) as JSON. '
            'Example: {"60": "50srvqlii4ru9gonprp35gkcfyd5weju"} '
            'Problem IDs can be obatined from staff debug info of '
            'the problems in the LMS.'
        ),
        multiline_editor=True,
    )

    countdown_time = Integer(
        display_name=_('Countdown Time (seconds)'),
        default=10,
        scope=Scope.settings,
        help=_('Time in seconds before the quiz closes automatically.')
    )

    editable_fields = [
        'video_id',
        'timemap',
        'countdown_time',
    ]

    def validate_field_data(self, validation, data):
        """
        Validate the user-submitted timemap.
        """
        try:
            json.loads(data.timemap)
        except ValueError:
            _ = self.runtime.service(self, "i18n").ugettext
            validation.add(ValidationMessage(ValidationMessage.ERROR, str(
                _("Invalid Timemap")
            )))

    # Decorate the view in order to support multiple devices e.g. mobile
    # See: https://openedx.atlassian.net/wiki/display/MA/Course+Blocks+API
    # section 'View @supports(multi_device) decorator'
    @XBlock.supports('multi_device')
    def student_view(self, context=None):  # pylint: disable=unused-argument
        """
        Show to students when viewing courses
        """
        fragment = self.build_fragment(
            path_html='html/invideoquiz.html',
            paths_css=[
                'css/invideoquiz.css',
            ],
            paths_js=[
                'js/src/invideoquiz.js',
            ],
            fragment_js='InVideoQuizXBlock',
            context={
                'video_id': self.video_id,
                'user_mode': self.user_mode,
                'countdown_time': self.countdown_time,
            },
        )
        config = get_resource_string('js/src/config.js')
        config = config.format(
            video_id=self.video_id,
            timemap=self.timemap,
            countdown_time=self.countdown_time,
        )
        fragment.add_javascript(config)
        return fragment

    @property
    def user_mode(self):
        """
        Check user's permission mode for this XBlock.
        Returns:
            user permission mode
        """
        try:
            if self.xmodule_runtime.user_is_staff:
                return 'staff'
        except AttributeError:
            pass
        return 'student'

    @staticmethod
    def workbench_scenarios():
        """
        A canned scenario for display in the workbench.
        """
        return [
            ("InVideoQuizXBlock",
             """<invideoquiz video_id='###' timemap='{ 10: "###" }' />
             """),
            ("Multiple InVideoQuizXBlock",
             """<vertical_demo>
                <invideoquiz video_id='###' timemap='{ 10: "###" }' />
                <invideoquiz video_id='###' timemap='{ 10: "###" }' />
                <invideoquiz video_id='###' timemap='{ 10: "###" }' />
                </vertical_demo>
             """),
        ]

    def get_resource_url(self, path):
        """
        Retrieve a public URL for the file path
        """
        path = os.path.join('public', path)
        resource_url = self.runtime.local_resource_url(self, path)
        return resource_url

    def build_fragment(  # pylint: disable=too-many-positional-arguments
            self,
            path_html='',
            paths_css=None,
            paths_js=None,
            urls_css=None,
            urls_js=None,
            fragment_js=None,
            context=None,
    ):  # pylint: disable=too-many-arguments
        """
        Assemble the HTML, JS, and CSS for an XBlock fragment
        """
        paths_css = paths_css or []
        paths_js = paths_js or []
        urls_css = urls_css or []
        urls_js = urls_js or []
        # If no context is provided, convert self.fields into a dict
        context = context or {
            key: getattr(self, key)
            for key in self.editable_fields
        }
        html_source = get_resource_string(path_html)
        html_source = html_source.format(
            **context
        )
        fragment = Fragment(html_source)
        for path in paths_css:
            url = self.get_resource_url(path)
            fragment.add_css_url(url)
        for path in paths_js:
            url = self.get_resource_url(path)
            fragment.add_javascript_url(url)
        for url in urls_css:
            fragment.add_css_url(url)
        for url in urls_js:
            fragment.add_javascript_url(url)
        if fragment_js:
            fragment.initialize_js(fragment_js)
        return fragment